#include "../include/stack.h"

#include <string.h>

void stackInit(SecurityStack *stack)
{
	memset(stack, 0, sizeof(*stack));
}

int stackPush(SecurityStack *stack, const char *event)
{
	size_t length;
	if (stack->count == SECURITY_STACK_CAPACITY)
	{
		memmove(stack->events, stack->events + 1, sizeof(stack->events[0]) * (SECURITY_STACK_CAPACITY - 1));
		stack->count--;
	}
	if (event == NULL)
	{
		stack->events[stack->count][0] = '\0';
	}
	else
	{
		length = strlen(event);
		if (length >= SECURITY_EVENT_TEXT_LENGTH)
			length = SECURITY_EVENT_TEXT_LENGTH - 1U;
		memcpy(stack->events[stack->count], event, length);
		stack->events[stack->count][length] = '\0';
	}
	stack->count++;
	stack->totalPushed++;
	return 1;
}

int stackPop(SecurityStack *stack, char *event, unsigned int capacity)
{
	size_t length;
	if (stack->count == 0U)
		return 0;
	stack->count--;
	if (event != NULL && capacity > 0U)
	{
		length = strlen(stack->events[stack->count]);
		if (length >= capacity)
			length = capacity - 1U;
		memcpy(event, stack->events[stack->count], length);
		event[length] = '\0';
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