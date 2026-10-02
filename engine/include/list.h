#ifndef LIST_H
#define LIST_H

#define ROUTE_METHOD_LENGTH 12
#define ROUTE_PATH_LENGTH 128
#define ROUTE_LIST_CAPACITY 32

typedef struct
{
	char method[ROUTE_METHOD_LENGTH];
	char path[ROUTE_PATH_LENGTH];
} RouteRule;

typedef struct
{
	RouteRule items[ROUTE_LIST_CAPACITY];
	unsigned int count;
} RouteList;

void routeListInit(RouteList *list);
int routeListAdd(RouteList *list, const char *method, const char *path);
int routeListRemove(RouteList *list, const char *method, const char *path);
int routeListFind(const RouteList *list, const char *method, const char *path);
int routeListUpdate(RouteList *list, const char *method, const char *path, const char *newPath);

#endif