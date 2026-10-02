#ifndef STACK_H
#define STACK_H

#define SECURITY_STACK_CAPACITY 256
#define SECURITY_EVENT_TEXT_LENGTH 192

typedef struct
{
	char events[SECURITY_STACK_CAPACITY][SECURITY_EVENT_TEXT_LENGTH];
	unsigned int count;
	unsigned long long totalPushed;
	unsigned long long totalPopped;
} SecurityStack;

void stackInit(SecurityStack *stack);
int stackPush(SecurityStack *stack, const char *event);
int stackPop(SecurityStack *stack, char *event, unsigned int capacity);
const char *stackPeek(const SecurityStack *stack);
unsigned int stackSize(const SecurityStack *stack);
int stackIsEmpty(const SecurityStack *stack);

#endif