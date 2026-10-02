#ifndef QUEUE_H
#define QUEUE_H

#include "request.h"

#define REQUEST_QUEUE_CAPACITY 64

typedef struct
{
	Request items[REQUEST_QUEUE_CAPACITY];
	unsigned int head;
	unsigned int tail;
	unsigned int count;
	unsigned long long totalEnqueued;
	unsigned long long totalDequeued;
} RequestQueue;

void queueInit(RequestQueue *queue);
int queueEnqueue(RequestQueue *queue, const Request *request);
int queueDequeue(RequestQueue *queue, Request *request);
const Request *queuePeek(const RequestQueue *queue);
unsigned int queueSize(const RequestQueue *queue);
int queueIsEmpty(const RequestQueue *queue);

#endif
