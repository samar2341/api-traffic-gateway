#include "../include/tree.h"

#include <stdlib.h>
#include <string.h>

static void copyStringLimited(char *destination, size_t capacity, const char *source)
{
	size_t length;
	if (destination == NULL || capacity == 0U)
		return;
	if (source == NULL)
	{
		destination[0] = '\0';
		return;
	}
	length = strlen(source);
	if (length >= capacity)
		length = capacity - 1U;
	memcpy(destination, source, length);
	destination[length] = '\0';
}

static ThreatNode *insertNode(ThreatNode *root, const char *category, const char *action)
{
	if (root == NULL)
	{
		root = (ThreatNode *)calloc(1, sizeof(ThreatNode));
		if (root == NULL)
			return NULL;
		copyStringLimited(root->category, sizeof(root->category), category);
		copyStringLimited(root->action, sizeof(root->action), action);
		return root;
	}
	int comparison = strcmp(category, root->category);
	if (comparison < 0)
		root->left = insertNode(root->left, category, action);
	else if (comparison > 0)
		root->right = insertNode(root->right, category, action);
	return root;
}

ThreatNode *threatTreeCreate(void)
{
	ThreatNode *root = NULL;
	root = insertNode(root, "FLOOD", "RATE_LIMIT");
	root = insertNode(root, "INVALID_REQUEST", "BLOCK");
	root = insertNode(root, "SQL_INJECTION", "BLOCK");
	root = insertNode(root, "UNAUTHORIZED", "BLOCK");
	root = insertNode(root, "VALID", "ALLOW");
	return root;
}

const ThreatNode *threatTreeSearch(const ThreatNode *root, const char *category)
{
	while (root != NULL)
	{
		int comparison = strcmp(category, root->category);
		if (comparison == 0)
			return root;
		root = comparison < 0 ? root->left : root->right;
	}
	return NULL;
}

void threatTreeDestroy(ThreatNode *root)
{
	if (root == NULL)
		return;
	threatTreeDestroy(root->left);
	threatTreeDestroy(root->right);
	free(root);
}