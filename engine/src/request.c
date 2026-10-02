#include "../include/request.h"

#include <string.h>

Request createRequest(const char *key, long timestamp)
{
    Request request = {0};

    strncpy(request.apiKey, key, API_KEY_LENGTH - 1);
    request.apiKey[API_KEY_LENGTH - 1] = '\0';

    request.timestamp = timestamp;

    return request;
}