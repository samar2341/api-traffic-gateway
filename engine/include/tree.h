#ifndef TREE_H
#define TREE_H

typedef struct ThreatNode
{
	char category[32];
	char action[16];
	struct ThreatNode *left;
	struct ThreatNode *right;
} ThreatNode;

ThreatNode *threatTreeCreate(void);
const ThreatNode *threatTreeSearch(const ThreatNode *root, const char *category);
void threatTreeDestroy(ThreatNode *root);

#endif