CC ?= gcc
CFLAGS ?= -std=c11 -O2 -Wall -Wextra -Werror
INCLUDES = -Iinclude
SOURCES = src/engine.c src/queue.c src/stack.c src/list.c src/linkedlist.c src/tree.c src/request.c
TARGET = bin/gateway_engine.exe
TEST_TARGET = bin/engine_tests.exe

.PHONY: all test clean

all: $(TARGET)

$(TARGET): $(SOURCES) include/request.h include/queue.h include/stack.h include/list.h include/linkedlist.h include/tree.h
	@mkdir -p bin
	$(CC) $(CFLAGS) $(INCLUDES) $(SOURCES) -o $(TARGET)

test: tests/test_structures.c $(filter-out src/engine.c,$(SOURCES))
	@mkdir -p bin
	$(CC) $(CFLAGS) $(INCLUDES) tests/test_structures.c $(filter-out src/engine.c,$(SOURCES)) -o $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -f $(TARGET)
