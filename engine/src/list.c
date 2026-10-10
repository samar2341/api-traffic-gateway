#include "../include/list.h"

#include <string.h>

void routeListInit(RouteList *list)
{
	memset(list, 0, sizeof(*list));
	routeListAdd(list, "GET", "/api/test");
	routeListAdd(list, "POST", "/api/test");
	routeListAdd(list, "PUT", "/api/test");
	routeListAdd(list, "PATCH", "/api/test");
	routeListAdd(list, "DELETE", "/api/test");
	routeListAdd(list, "GET", "/api/admin");
	routeListAdd(list, "POST", "/api/admin");
	routeListAdd(list, "PUT", "/api/admin");
	routeListAdd(list, "PATCH", "/api/admin");
	routeListAdd(list, "DELETE", "/api/admin");
	routeListAdd(list, "GET", "/api/protected");
	routeListAdd(list, "POST", "/api/protected");
	routeListAdd(list, "PUT", "/api/protected");
	routeListAdd(list, "PATCH", "/api/protected");
	routeListAdd(list, "DELETE", "/api/protected");
}

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

int routeListAdd(RouteList *list, const char *method, const char *path)
{
	if (list->count == ROUTE_LIST_CAPACITY || routeListFind(list, method, path))
		return 0;
	copyStringLimited(list->items[list->count].method, sizeof(list->items[list->count].method), method);
	copyStringLimited(list->items[list->count].path, sizeof(list->items[list->count].path), path);
	list->count++;
	return 1;
}

int routeListRemove(RouteList *list, const char *method, const char *path)
{
	for (unsigned int i = 0; i < list->count; i++)
		if (strcmp(list->items[i].method, method) == 0 && strcmp(list->items[i].path, path) == 0)
		{
			for (unsigned int j = i + 1; j < list->count; j++)
				list->items[j - 1] = list->items[j];
			list->count--;
			return 1;
		}
	return 0;
}

int routeListFind(const RouteList *list, const char *method, const char *path)
{
	for (unsigned int i = 0; i < list->count; i++)
		if (strcmp(list->items[i].method, method) == 0 && strcmp(list->items[i].path, path) == 0)
			return 1;
	return 0;
}

int routeListUpdate(RouteList *list, const char *method, const char *path, const char *newPath)
{
	for (unsigned int i = 0; i < list->count; i++)
		if (strcmp(list->items[i].method, method) == 0 && strcmp(list->items[i].path, path) == 0)
		{
			copyStringLimited(list->items[i].path, sizeof(list->items[i].path), newPath);
			return 1;
		}
	return 0;
}