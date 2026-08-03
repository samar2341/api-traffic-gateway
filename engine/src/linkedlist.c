#include "../include/linkedlist.h"

#include <stdlib.h>

void initLinkedList(LinkedList *list)
{
    list->head = NULL;
    list->tail = NULL;
    list->size = 0;
}

void pushBack(LinkedList *list, Request request)
{
    Node *node = (Node *)malloc(sizeof(Node));

    node->data = request;
    node->next = NULL;

    if (list->tail == NULL)
    {
        list->head = node;
        list->tail = node;
    }
    else
    {
        list->tail->next = node;
        list->tail = node;
    }

    list->size++;
}

void popFront(LinkedList *list)
{
    if (list->head == NULL)
        return;

    Node *temp = list->head;

    list->head = list->head->next;

    free(temp);

    if (list->head == NULL)
        list->tail = NULL;

    list->size--;
}

Node *front(LinkedList *list)
{
    return list->head;
}

int isEmpty(LinkedList *list)
{
    return list->size == 0;
}