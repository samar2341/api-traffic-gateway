#include "../include/queue.h"

#include <string.h>

void queueInit(RequestQueue *queue)
{
	memset(queue, 0, sizeof(*queue));
}

int queueEnqueue(RequestQueue *queue, const Request *request)
{
	if (queue->count == REQUEST_QUEUE_CAPACITY)
		return 0;
	queue->items[queue->tail] = *request;
	queue->tail = (queue->tail + 1U) % REQUEST_QUEUE_CAPACITY;
	queue->count++;
	queue->totalEnqueued++;
	return 1;
}

int queueDequeue(RequestQueue *queue, Request *request)
{
	if (queue->count == 0U)
		return 0;
	if (request != NULL)
		*request = queue->items[queue->head];
	queue->head = (queue->head + 1U) % REQUEST_QUEUE_CAPACITY;
	queue->count--;
	queue->totalDequeued++;
	return 1;
}

const Request *queuePeek(const RequestQueue *queue)
{
	return queue->count == 0U ? NULL : &queue->items[queue->head];
}

unsigned int queueSize(const RequestQueue *queue)
{
	return queue->count;
}

int queueIsEmpty(const RequestQueue *queue)
{
	return queue->count == 0U;
}
