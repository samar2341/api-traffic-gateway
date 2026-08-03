#ifndef REQUEST_H
#define REQUEST_H

#define API_KEY_LENGTH 64

typedef struct
{
    char apiKey[API_KEY_LENGTH];
    long timestamp;

} Request;

Request createRequest(const char *key, long timestamp);

#endif