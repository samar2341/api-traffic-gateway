#include "../include/linkedlist.h"

#include <stdlib.h>
#include <string.h>

void initLinkedList(LinkedList *list)
{
    list->head = NULL;
    list->tail = NULL;
    list->size = 0;
}

static int appendNode(LinkedList *list, const Request *request)
{
    RequestNode *node = (RequestNode *)malloc(sizeof(RequestNode));
    if (node == NULL)
        return 0;
    node->data = *request;
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
    return 1;
}

int appendRequest(LinkedList *list, const Request *request)
{
    if (list->size >= REQUEST_HISTORY_CAPACITY)
        popFront(list);
    return appendNode(list, request);
}

int prependRequest(LinkedList *list, const Request *request)
{
    RequestNode *node = (RequestNode *)malloc(sizeof(RequestNode));
    if (node == NULL)
        return 0;
    node->data = *request;
    node->next = list->head;
    list->head = node;
    if (list->tail == NULL)
        list->tail = node;
    list->size++;
    if (list->size > REQUEST_HISTORY_CAPACITY)
    {
        RequestNode *current = list->head;
        while (current->next != list->tail)
            current = current->next;
        free(list->tail);
        list->tail = current;
        current->next = NULL;
        list->size--;
    }
    return 1;
}

int removeRequest(LinkedList *list, const char *requestId)
{
    RequestNode *previous = NULL;
    RequestNode *current = list->head;
    while (current != NULL)
    {
        if (strcmp(current->data.id, requestId) == 0)
        {
            if (previous == NULL)
                list->head = current->next;
            else
                previous->next = current->next;
            if (list->tail == current)
                list->tail = previous;
            free(current);
            list->size--;
            return 1;
        }
        previous = current;
        current = current->next;
    }
    return 0;
}

RequestNode *findRequest(LinkedList *list, const char *requestId)
{
    RequestNode *current = list->head;
    while (current != NULL)
    {
        if (strcmp(current->data.id, requestId) == 0)
            return current;
        current = current->next;
    }
    return NULL;
}

unsigned int traverseRequests(const LinkedList *list, Request *output, unsigned int capacity)
{
    const RequestNode *current = list->head;
    unsigned int copied = 0;
    while (current != NULL && copied < capacity)
    {
        output[copied++] = current->data;
        current = current->next;
    }
    return copied;
}

void popFront(LinkedList *list)
{
    if (list->head == NULL)
        return;

    RequestNode *temp = list->head;

    list->head = list->head->next;

    free(temp);

    if (list->head == NULL)
        list->tail = NULL;

    list->size--;
}

void destroyLinkedList(LinkedList *list)
{
    while (list->head != NULL)
        popFront(list);
}