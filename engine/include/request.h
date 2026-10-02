#ifndef REQUEST_H
#define REQUEST_H

#define REQUEST_ID_LENGTH 48
#define REQUEST_SOURCE_LENGTH 64
#define REQUEST_METHOD_LENGTH 12
#define REQUEST_ENDPOINT_LENGTH 256
#define REQUEST_INPUT_LENGTH 65536
#define REQUEST_REASON_LENGTH 160
#define REQUEST_EVENT_LENGTH 32
#define API_KEY_LENGTH 64

typedef struct
{
    char id[REQUEST_ID_LENGTH];
    char source[REQUEST_SOURCE_LENGTH];
    char method[REQUEST_METHOD_LENGTH];
    char endpoint[REQUEST_ENDPOINT_LENGTH];
    char input[REQUEST_INPUT_LENGTH];
    char decision[16];
    char reason[REQUEST_REASON_LENGTH];
    char eventType[REQUEST_EVENT_LENGTH];
    int statusCode;
    int authenticated;
    int admin;
    long long timestampMs;
    char apiKey[API_KEY_LENGTH];
    long timestamp;
} Request;

Request createRequest(const char *key, long timestamp);

#endif