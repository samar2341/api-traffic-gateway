#ifndef LINKEDLIST_H
#define LINKEDLIST_H

#include "request.h"

typedef struct Node
{
    Request data;
    struct Node *next;

} Node;

typedef struct
{
    Node *head;
    Node *tail;
    int size;

} LinkedList;

void initLinkedList(LinkedList *list);

void pushBack(LinkedList *list, Request request);

void popFront(LinkedList *list);

Node *front(LinkedList *list);

int isEmpty(LinkedList *list);

#endif