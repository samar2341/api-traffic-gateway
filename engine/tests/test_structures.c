#include "../include/linkedlist.h"
#include "../include/list.h"
#include "../include/queue.h"
#include "../include/stack.h"
#include "../include/tree.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

static Request makeRequest(const char *id)
{
    Request request = {0};
    strncpy(request.id, id, sizeof(request.id) - 1);
    return request;
}

static void testQueue(void)
{
    RequestQueue queue;
    Request first = makeRequest("first");
    Request second = makeRequest("second");
    Request output = {0};
    queueInit(&queue);
    assert(queueIsEmpty(&queue));
    assert(queueEnqueue(&queue, &first));
    assert(queueEnqueue(&queue, &second));
    assert(strcmp(queuePeek(&queue)->id, "first") == 0);
    assert(queueDequeue(&queue, &output));
    assert(strcmp(output.id, "first") == 0);
    assert(queueDequeue(&queue, &output));
    assert(strcmp(output.id, "second") == 0);
    assert(!queueDequeue(&queue, &output));
    assert(queue.totalEnqueued == 2 && queue.totalDequeued == 2);
}

static void testStack(void)
{
    SecurityStack stack;
    char popped[SECURITY_EVENT_TEXT_LENGTH];
    stackInit(&stack);
    assert(stackIsEmpty(&stack));
    assert(stackPush(&stack, "INVALID_REQUEST"));
    assert(stackPush(&stack, "SQL_INJECTION"));
    assert(strcmp(stackPeek(&stack), "SQL_INJECTION") == 0);
    assert(stackPop(&stack, popped, sizeof(popped)));
    assert(strcmp(popped, "SQL_INJECTION") == 0);
    assert(stackSize(&stack) == 1);
}

static void testList(void)
{
    RouteList routes;
    routeListInit(&routes);
    assert(routeListFind(&routes, "GET", "/api/test"));
    assert(routeListAdd(&routes, "GET", "/api/custom"));
    assert(routeListUpdate(&routes, "GET", "/api/custom", "/api/renamed"));
    assert(routeListFind(&routes, "GET", "/api/renamed"));
    assert(routeListRemove(&routes, "GET", "/api/renamed"));
    assert(!routeListFind(&routes, "GET", "/api/renamed"));
}

static void testLinkedList(void)
{
    LinkedList history;
    Request oldest = makeRequest("oldest");
    Request newest = makeRequest("newest");
    Request output[2] = {{0}};
    initLinkedList(&history);
    assert(appendRequest(&history, &oldest));
    assert(prependRequest(&history, &newest));
    assert(history.size == 2);
    assert(strcmp(findRequest(&history, "oldest")->data.id, "oldest") == 0);
    assert(traverseRequests(&history, output, 2) == 2);
    assert(strcmp(output[0].id, "newest") == 0);
    assert(removeRequest(&history, "oldest"));
    assert(findRequest(&history, "oldest") == NULL);
    destroyLinkedList(&history);
    assert(history.size == 0);
}

static void testTree(void)
{
    ThreatNode *rules = threatTreeCreate();
    const ThreatNode *sql = threatTreeSearch(rules, "SQL_INJECTION");
    const ThreatNode *flood = threatTreeSearch(rules, "FLOOD");
    assert(sql != NULL && strcmp(sql->action, "BLOCK") == 0);
    assert(flood != NULL && strcmp(flood->action, "RATE_LIMIT") == 0);
    assert(threatTreeSearch(rules, "MISSING") == NULL);
    threatTreeDestroy(rules);
}

int main(void)
{
    testQueue();
    testStack();
    testList();
    testLinkedList();
    testTree();
    puts("All C DSA tests passed.");
    return 0;
}