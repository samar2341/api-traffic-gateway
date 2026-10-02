#ifndef LINKEDLIST_H
#define LINKEDLIST_H

#include "request.h"

#define REQUEST_HISTORY_CAPACITY 500

typedef struct RequestNode
{
    Request data;
    struct RequestNode *next;
} RequestNode;

typedef struct
{
    RequestNode *head;
    RequestNode *tail;
    unsigned int size;
} LinkedList;

void initLinkedList(LinkedList *list);
void popFront(LinkedList *list);
int appendRequest(LinkedList *list, const Request *request);
int prependRequest(LinkedList *list, const Request *request);
int removeRequest(LinkedList *list, const char *requestId);
RequestNode *findRequest(LinkedList *list, const char *requestId);
unsigned int traverseRequests(const LinkedList *list, Request *output, unsigned int capacity);
void destroyLinkedList(LinkedList *list);

#endif