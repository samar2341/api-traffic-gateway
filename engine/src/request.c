#include "../include/request.h"

#include <string.h>

Request createRequest(const char *key, long timestamp)
{
    Request request = {0};
    size_t length;

    if (key == NULL)
    {
        request.apiKey[0] = '\0';
    }
    else
    {
        length = strlen(key);
        if (length >= sizeof(request.apiKey))
            length = sizeof(request.apiKey) - 1U;
        memcpy(request.apiKey, key, length);
        request.apiKey[length] = '\0';
    }

    request.timestamp = timestamp;

    return request;
}