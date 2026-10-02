#include "../include/stack.h"

#include <string.h>

void stackInit(SecurityStack *stack)
{
	memset(stack, 0, sizeof(*stack));
}

int stackPush(SecurityStack *stack, const char *event)
{
	if (stack->count == SECURITY_STACK_CAPACITY)
	{
		memmove(stack->events, stack->events + 1, sizeof(stack->events[0]) * (SECURITY_STACK_CAPACITY - 1));
		stack->count--;
	}
	strncpy(stack->events[stack->count], event, SECURITY_EVENT_TEXT_LENGTH - 1);
	stack->events[stack->count][SECURITY_EVENT_TEXT_LENGTH - 1] = '\0';
	stack->count++;
	stack->totalPushed++;
	return 1;
}

int stackPop(SecurityStack *stack, char *event, unsigned int capacity)
{
	if (stack->count == 0U)
		return 0;
	stack->count--;
	if (event != NULL && capacity > 0U)
	{
		strncpy(event, stack->events[stack->count], capacity - 1U);
		event[capacity - 1U] = '\0';
	}
	stack->totalPopped++;
	return 1;
}

const char *stackPeek(const SecurityStack *stack)
{
	return stack->count == 0U ? NULL : stack->events[stack->count - 1U];
}

unsigned int stackSize(const SecurityStack *stack)
{
	return stack->count;
}

int stackIsEmpty(const SecurityStack *stack)
{
	return stack->count == 0U;
}