# API TRAFFIC GATEWAY - Intelligent API Traffic Control Engine

> A lightweight API Traffic Control Engine that monitors, analyzes, and regulates API requests using fundamental Data Structures and Algorithms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Language](https://img.shields.io/badge/C-Engine-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![DSA](https://img.shields.io/badge/Data%20Structures-Core-orange)

---

## Overview

SentinelRL is a **Developer Infrastructure Tool** that acts as an intelligent gateway between clients and backend APIs.

Instead of allowing every incoming request to directly reach the server, SentinelRL analyzes every request using various Data Structures to determine whether it should be:

- ✅ Allowed
- ⏳ Delayed
- ❌ Blocked
- 📊 Logged
- 📈 Analyzed

The objective of the project is to demonstrate how classical Data Structures can solve modern backend engineering problems.

---

## Problem Statement

Modern applications receive thousands of API requests every second.

Without proper traffic control:

- Servers become overloaded
- API abuse becomes common
- Performance decreases
- Resources are wasted
- Monitoring becomes difficult

SentinelRL acts as a middleware layer that intelligently processes API traffic before forwarding requests to the backend.

---

## Architecture

```

┌──────────────┐
│   Client     │
│ (Browser)    │
└──────┬───────┘
│
▼
┌────────────────────────────┐
│       SentinelRL           │
│ API Traffic Control Engine │
└────────────┬───────────────┘
│
├──────────────┐
│              │
▼              ▼
Decision     Analytics
Engine
│
▼
┌──────────────┐
│ Demo Backend │
└──────────────┘

```

---

# Features

## Request Monitoring

Monitors every incoming API request.

---

## Traffic Control

Controls request flow before it reaches the backend.

---

## Rate Limiting

Limits excessive API requests from users.

---

## Request Queue

Maintains request order using Queue.

---

## User Tracking

Tracks active users and request statistics.

---

## Request Analytics

Generates statistics including

- Total Requests
- Allowed Requests
- Blocked Requests
- Active Users
- Traffic Distribution

---

## Search Requests

Search users or requests efficiently.

---

## Sort Reports

Generate sorted reports based on

- User ID
- Request Count
- Time
- Endpoint

---

## Configurable Rules

Administrator can configure

- Maximum Requests
- Time Window
- Queue Size

---

# Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript

## Backend

- Node.js
- Express.js

## Core Engine

- C Programming

## Communication

- Child Process / Native Integration

---

# Project Structure

```

SentinelRL/

│

├── frontend/

│ ├── index.html

│ ├── dashboard.js

│ ├── style.css

│

├── server/

│ ├── server.js

│ ├── routes/

│ ├── controllers/

│ └── middleware/

│

├── engine/

│ ├── rate_limiter.c

│ ├── hash_table.c

│ ├── queue.c

│ ├── linked_list.c

│ ├── bst.c

│ ├── sorting.c

│ ├── searching.c

│ └── utils.c

│

├── docs/

│

├── README.md

│

└── LICENSE

```

---

# Working

```

User Request

↓

Browser

↓

Express Server

↓

SentinelRL Engine

↓

Hash Lookup

↓

Request Queue

↓

Decision Engine

↓

Allow / Block

↓

Backend API

↓

Response

```

---

# Data Structures Used

## 1. Arrays

Used for

- Statistics
- Request Counters
- Analytics
- Configuration

Operations

- Insert
- Update
- Delete
- Traverse

---

## 2. Queue

Stores incoming API requests in FIFO order.

Used for

- Request Processing
- Sliding Window
- Waiting Requests

Operations

- Enqueue
- Dequeue
- Peek

---

## 3. Circular Queue

Used to maintain a fixed-size request history.

Benefits

- Constant Memory
- Efficient Rotation

---

## 4. Linked List

Used to implement dynamic request queues.

Benefits

- Dynamic Memory
- Fast Insertions
- Fast Deletions

---

## 5. Stack

Used for

- Undo Configuration
- Rollback Operations

---

## 6. Hash Table

Core Data Structure.

Maps

```

User ID

↓

Hash Function

↓

Bucket

↓

User Record

```

Average Lookup

```

O(1)

```

---

## 7. Binary Search Tree

Stores

- Active Users
- Request Counts

Provides

- Ordered Traversal
- Analytics
- Sorted Reports

---

## 8. Searching Algorithms

Implemented

- Linear Search
- Binary Search

Applications

- Search Users
- Search Requests
- Search Logs

---

## 9. Sorting Algorithms

Implemented

- Bubble Sort
- Selection Sort
- Insertion Sort

Applications

- Reports
- Analytics
- User Ranking

---

# DSA Coverage

| Unit | Topic | Used |
|-------|-------|------|
| Unit 1 | Arrays | ✅ |
| Unit 1 | Pointers | ✅ |
| Unit 1 | Dynamic Memory Allocation | ✅ |
| Unit 2 | Stack | ✅ |
| Unit 2 | Queue | ✅ |
| Unit 2 | Circular Queue | ✅ |
| Unit 2 | Deque *(Optional)* | ✅ |
| Unit 2 | Priority Queue *(Optional)* | ✅ |
| Unit 3 | Linked List | ✅ |
| Unit 3 | Circular Linked List | ✅ |
| Unit 3 | Doubly Linked List | ✅ |
| Unit 3 | Stack using Linked List | ✅ |
| Unit 3 | Queue using Linked List | ✅ |
| Unit 4 | Sequential Search | ✅ |
| Unit 4 | Binary Search | ✅ |
| Unit 4 | Hash Table | ✅ |
| Unit 4 | Bubble Sort | ✅ |
| Unit 4 | Selection Sort | ✅ |
| Unit 4 | Insertion Sort | ✅ |
| Unit 5 | Binary Tree | ✅ |
| Unit 5 | BST | ✅ |
| Unit 5 | Tree Traversals | ✅ |
| Unit 5 | Threaded Binary Tree *(Analytics Module)* | ✅ |
| Unit 5 | Huffman Tree *(Log Compression Module)* | ✅ |

---

# Future Scope

- Redis Integration
- Authentication
- JWT Support
- API Key Management
- Dashboard Analytics
- Docker Deployment
- Kubernetes Support
- Distributed Cache
- Redis Benchmarking
- Reverse Proxy Support

---

# Learning Outcomes

After completing SentinelRL, students will understand

- Practical implementation of Data Structures
- API request lifecycle
- Backend architecture
- Middleware concepts
- Traffic control mechanisms
- Performance optimization
- System design fundamentals

---

# Team

### Backend & DSA Engine

- Core Data Structures
- Request Processing
- Algorithms

### Frontend

- Dashboard
- Visualization
- Reports

### Backend Integration

- Express APIs
- Communication Layer
- Middleware

---

# License

This project is developed for academic and educational purposes as a part of the Project-Based Learning.

---

> *"Building modern backend infrastructure using classical Data Structures."*