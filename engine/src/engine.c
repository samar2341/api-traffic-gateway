#include "../include/linkedlist.h"
#include "../include/list.h"
#include "../include/queue.h"
#include "../include/stack.h"
#include "../include/tree.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define INPUT_LINE_LENGTH 131072
#define SOURCE_BUCKETS 256
#define SQL_RULE_CAPACITY 64
#define SQL_RULE_LENGTH 96

typedef struct
{
	char source[REQUEST_SOURCE_LENGTH];
	long long windowStartMs;
	unsigned int requestCount;
	long long secondStartMs;
	unsigned int secondCount;
} SourceCounter;

static RequestQueue requestQueue;
static SecurityStack eventStack;
static LinkedList requestHistory;
static RouteList routeRules;
static ThreatNode *threatRules;
static SourceCounter sourceCounters[SOURCE_BUCKETS];
static unsigned int sourceCursor;
static unsigned int rateLimit = 100;
static unsigned int floodThreshold = 30;
static char sqlRules[SQL_RULE_CAPACITY][SQL_RULE_LENGTH];
static unsigned int sqlRuleCount;

static void copyField(char *destination, size_t capacity, const char *source)
{
	size_t length;
	if (destination == NULL || capacity == 0U)
		return;
	if (source == NULL)
	{
		destination[0] = '\0';
		return;
	}
	length = strlen(source);
	if (length >= capacity)
		length = capacity - 1U;
	memcpy(destination, source, length);
	destination[length] = '\0';
}

static char *nextField(char **cursor)
{
	char *field = *cursor;
	char *separator = strchr(field, '\t');
	if (separator != NULL)
	{
		*separator = '\0';
		*cursor = separator + 1;
	}
	else
		*cursor = field + strlen(field);
	return field;
}

static void uppercaseCopy(char *destination, size_t capacity, const char *source)
{
	size_t i;
	for (i = 0; i + 1 < capacity && source[i] != '\0'; i++)
		destination[i] = (char)toupper((unsigned char)source[i]);
	destination[i] = '\0';
}

static int containsSqlPattern(const char *input)
{
	char normalized[REQUEST_INPUT_LENGTH];
	uppercaseCopy(normalized, sizeof(normalized), input);
	for (unsigned int i = 0; i < sqlRuleCount; i++)
	{
		char normalizedPattern[SQL_RULE_LENGTH];
		uppercaseCopy(normalizedPattern, sizeof(normalizedPattern), sqlRules[i]);
		if (normalizedPattern[0] != '\0' && strstr(normalized, normalizedPattern) != NULL)
			return 1;
	}
	return 0;
}

static void clearSqlRules(void)
{
	memset(sqlRules, 0, sizeof(sqlRules));
	sqlRuleCount = 0;
}

static int addSqlRule(const char *pattern)
{
	if (pattern[0] == '\0' || sqlRuleCount == SQL_RULE_CAPACITY)
		return 0;
	for (unsigned int i = 0; i < sqlRuleCount; i++)
		if (strcmp(sqlRules[i], pattern) == 0)
			return 1;
	copyField(sqlRules[sqlRuleCount], sizeof(sqlRules[0]), pattern);
	sqlRuleCount++;
	return 1;
}

static void removeSqlRule(const char *pattern)
{
	for (unsigned int i = 0; i < sqlRuleCount; i++)
		if (strcmp(sqlRules[i], pattern) == 0)
		{
			for (unsigned int j = i + 1; j < sqlRuleCount; j++)
				memcpy(sqlRules[j - 1], sqlRules[j], sizeof(sqlRules[0]));
			sqlRuleCount--;
			return;
		}
}

static SourceCounter *getSourceCounter(const char *source, long long now)
{
	for (unsigned int i = 0; i < SOURCE_BUCKETS; i++)
		if (strcmp(sourceCounters[i].source, source) == 0)
			return &sourceCounters[i];
	SourceCounter *counter = &sourceCounters[sourceCursor++ % SOURCE_BUCKETS];
	memset(counter, 0, sizeof(*counter));
	copyField(counter->source, sizeof(counter->source), source);
	counter->windowStartMs = now;
	counter->secondStartMs = now;
	return counter;
}

static void setDecision(Request *request, const char *category, const char *reason, int status)
{
	const ThreatNode *rule = threatTreeSearch(threatRules, category);
	copyField(request->eventType, sizeof(request->eventType), category);
	copyField(request->decision, sizeof(request->decision), rule == NULL ? "BLOCK" : rule->action);
	copyField(request->reason, sizeof(request->reason), reason);
	request->statusCode = status;
}

static void processRequest(Request *request, long long now)
{
	if (request->method[0] == '\0' || request->endpoint[0] != '/' ||
		!routeListFind(&routeRules, request->method, request->endpoint))
	{
		setDecision(request, "INVALID_REQUEST", "Unsupported method or endpoint", 400);
	}
	else if (strcmp(request->input, "INVALID_JSON") == 0)
	{
		setDecision(request, "INVALID_REQUEST", "Malformed JSON request body", 400);
	}
	else if (strcmp(request->endpoint, "/api/admin") == 0 && !request->admin)
	{
		setDecision(request, "UNAUTHORIZED", request->authenticated ? "Administrator permission required" : "Authentication required", request->authenticated ? 403 : 401);
	}
	else if (!request->authenticated)
	{
		setDecision(request, "UNAUTHORIZED", "Authentication required", 401);
	}
	else if (strcmp(request->input, "SOURCE_BLOCKED") == 0)
	{
		setDecision(request, "FLOOD", "Source is temporarily blocked", 429);
	}
	else
	{
		SourceCounter *counter = getSourceCounter(request->source, now);
		if (now - counter->windowStartMs >= 60000)
		{
			counter->windowStartMs = now;
			counter->requestCount = 0;
		}
		counter->requestCount++;
		if (now - counter->secondStartMs >= 1000)
		{
			counter->secondStartMs = now;
			counter->secondCount = 0;
		}
		counter->secondCount++;
		if (counter->secondCount > floodThreshold)
			setDecision(request, "FLOOD", "Per-source traffic burst threshold exceeded", 429);
		else if (counter->requestCount > rateLimit)
			setDecision(request, "FLOOD", "Per-source request limit exceeded", 429);
		else if (containsSqlPattern(request->input))
			setDecision(request, "SQL_INJECTION", "SQL injection pattern detected", 403);
		else
		{
			copyField(request->eventType, sizeof(request->eventType), "NONE");
			copyField(request->decision, sizeof(request->decision), "ALLOW");
			copyField(request->reason, sizeof(request->reason), "Request passed gateway checks");
			request->statusCode = 200;
		}
	}

	if (strcmp(request->decision, "ALLOW") != 0)
	{
		char event[SECURITY_EVENT_TEXT_LENGTH];
		size_t offset = 0;
		size_t length;
		event[0] = '\0';
		length = strlen(request->eventType);
		if (length > 0U && offset + length < sizeof(event))
		{
			memcpy(event + offset, request->eventType, length);
			offset += length;
		}
		if (offset + 1U < sizeof(event))
		{
			event[offset++] = '|';
		}
		length = strlen(request->source);
		if (length > 0U && offset + length < sizeof(event))
		{
			memcpy(event + offset, request->source, length);
			offset += length;
		}
		if (offset + 1U < sizeof(event))
		{
			event[offset++] = '|';
		}
		length = strlen(request->endpoint);
		if (length > 0U && offset + length < sizeof(event))
		{
			memcpy(event + offset, request->endpoint, length);
			offset += length;
		}
		event[sizeof(event) - 1U] = '\0';
		stackPush(&eventStack, event);
	}
	appendRequest(&requestHistory, request);
}

static void emitResult(const Request *request)
{
	printf("%s\t%d\t%s\t%s\t%u\t%llu\t%llu\t%u\t%u\t%u\t%s\n",
		   request->decision,
		   request->statusCode,
		   request->eventType,
		   request->reason,
		   queueSize(&requestQueue),
		   requestQueue.totalEnqueued,
		   requestQueue.totalDequeued,
		   stackSize(&eventStack),
		   requestHistory.size,
		   routeRules.count,
		   stackPeek(&eventStack) == NULL ? "" : stackPeek(&eventStack));
	fflush(stdout);
}

static void initialize(void)
{
	const char *configuredLimit = getenv("GATEWAY_RATE_LIMIT");
	const char *configuredFlood = getenv("GATEWAY_FLOOD_THRESHOLD");
	if (configuredLimit != NULL)
		rateLimit = (unsigned int)strtoul(configuredLimit, NULL, 10);
	if (configuredFlood != NULL)
		floodThreshold = (unsigned int)strtoul(configuredFlood, NULL, 10);
	if (floodThreshold == 0U)
		floodThreshold = 30U;
	queueInit(&requestQueue);
	stackInit(&eventStack);
	initLinkedList(&requestHistory);
	routeListInit(&routeRules);
	threatRules = threatTreeCreate();
	addSqlRule("' OR '");
	addSqlRule(" OR 1=1");
	addSqlRule("UNION SELECT");
	addSqlRule("DROP TABLE");
	addSqlRule("INSERT INTO");
	addSqlRule("--");
	addSqlRule("SLEEP(");
}

int main(void)
{
	char line[INPUT_LINE_LENGTH];
	initialize();
	while (fgets(line, sizeof(line), stdin) != NULL)
	{
		if (strncmp(line, "RULE\t", 5) == 0)
		{
			char *operation = line + 5;
			operation[strcspn(operation, "\r\n")] = '\0';
			char *separator = strchr(operation, '\t');
			char *pattern = "";
			if (separator != NULL)
			{
				*separator = '\0';
				pattern = separator + 1;
			}
			if (strcmp(operation, "CLEAR") == 0)
				clearSqlRules();
			else if (strcmp(operation, "ADD") == 0)
				addSqlRule(pattern);
			else if (strcmp(operation, "REMOVE") == 0)
				removeSqlRule(pattern);
			printf("RULE_OK\t%u\n", sqlRuleCount);
			fflush(stdout);
			continue;
		}
		Request request = {0};
		char *cursor = line;
		char *fields[8];
		for (unsigned int i = 0; i < 8; i++)
			fields[i] = nextField(&cursor);
		line[strcspn(line, "\r\n")] = '\0';
		copyField(request.id, sizeof(request.id), fields[0]);
		copyField(request.source, sizeof(request.source), fields[1]);
		copyField(request.method, sizeof(request.method), fields[2]);
		copyField(request.endpoint, sizeof(request.endpoint), fields[3]);
		request.authenticated = atoi(fields[4]) != 0;
		request.admin = atoi(fields[5]) != 0;
		if (atoi(fields[6]) != 0)
			copyField(request.input, sizeof(request.input), "SOURCE_BLOCKED");
		else
			copyField(request.input, sizeof(request.input), fields[7]);
		request.timestampMs = (long long)time(NULL) * 1000;
		if (!queueEnqueue(&requestQueue, &request))
		{
			setDecision(&request, "FLOOD", "Request queue is full", 503);
			emitResult(&request);
			continue;
		}
		Request queued = {0};
		queueDequeue(&requestQueue, &queued);
		processRequest(&queued, request.timestampMs);
		emitResult(&queued);
	}
	destroyLinkedList(&requestHistory);
	threatTreeDestroy(threatRules);
	return 0;
}
