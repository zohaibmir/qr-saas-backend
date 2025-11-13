# 🚀 QR SaaS Stream Processing Setup
**Complete Guide to Event-Driven Architecture**

## 📋 Quick Start

### 1. Start Stream Processing Infrastructure
```bash
# Start all streaming components
npm run streams:start

# Or manually
./stream-manager.sh start
```

### 2. Access Management UIs
- **Kafka UI**: http://localhost:8080 (Topic management)
- **Redis Commander**: http://localhost:8082 (Redis streams monitoring)
- **Schema Registry**: http://localhost:8081 (Schema management)

### 3. Verify Installation
```bash
# Check health of all services
npm run streams:health

# List created topics
npm run streams:topics
```

## 🏗️ Infrastructure Components

### Apache Kafka Cluster
- **Broker**: Port 9092
- **Topics**: 13 pre-configured topics
- **Partitions**: Optimized per use case (3-50 partitions)
- **Retention**: 3 days to 1 year based on data type

### Redis Streams
- **Port**: 6379
- **Configuration**: Optimized for streams performance
- **Use Case**: Lightweight queues and real-time updates

### Schema Registry
- **Port**: 8081
- **Purpose**: Avro schema management
- **Compatibility**: Backward compatibility enforced

### Kafka Connect
- **Port**: 8083
- **Connectors**: PostgreSQL, Elasticsearch ready
- **Purpose**: External system integrations

## 📊 Pre-configured Topics

| Topic Name | Partitions | Retention | Use Case |
|------------|------------|-----------|----------|
| `bulk-qr-processing` | 10 | 7 days | QR batch generation |
| `analytics-events` | 50 | 30 days | Real-time scan tracking |
| `notifications` | 5 | 3 days | Email/SMS delivery |
| `file-processing` | 8 | 7 days | File uploads & processing |
| `payment-events` | 3 | 90 days | Payment webhooks |
| `team-collaboration` | 5 | 30 days | Team activities |
| `content-publishing` | 5 | 7 days | Content workflows |
| `ecommerce-sync` | 3 | 7 days | Inventory synchronization |
| `business-automation` | 3 | 7 days | Domain/SSL automation |
| `user-lifecycle` | 5 | 30 days | User onboarding |
| `data-retention` | 3 | 7 days | Cleanup automation |
| `audit-logs` | 3 | 1 year | Compliance tracking |
| `dead-letter-queue` | 3 | 7 days | Failed message handling |

## 🛠️ Management Commands

### Infrastructure Management
```bash
# Start/stop infrastructure
npm run streams:start
npm run streams:stop
npm run streams:health

# Open management UIs
npm run streams:ui      # Kafka UI
npm run streams:redis   # Redis Commander
```

### Topic Management
```bash
# List all topics
npm run streams:topics

# Create new topic
npm run kafka:create-topic user-events 5 86400000

# Delete topic (with confirmation)
npm run kafka:delete-topic user-events

# Describe topic details
npm run kafka:describe-topic analytics-events
```

### Consumer Group Management
```bash
# List consumer groups
npm run streams:groups

# Describe consumer group
./stream-manager.sh describe-group qr-processors

# Reset consumer group offsets
./stream-manager.sh reset-group qr-processors bulk-qr-processing
```

### Testing & Debugging
```bash
# Send test message
npm run kafka:test-message analytics-events '{"userId":"test","action":"scan"}'

# Consume messages (live)
npm run kafka:consume analytics-events

# Consume from beginning
npm run kafka:consume analytics-events from-beginning
```

## 🎯 Implementation Priorities

### Phase 1: High-Impact (Weeks 1-2)
✅ Infrastructure setup complete
- [ ] Bulk QR generation stream
- [ ] Real-time analytics events
- [ ] Notification delivery queue

### Phase 2: Business Logic (Weeks 3-4)
- [ ] File processing pipeline
- [ ] Payment event handling
- [ ] Team collaboration events

### Phase 3: Automation (Weeks 5-6)
- [ ] Data retention automation
- [ ] E-commerce synchronization
- [ ] Content publishing workflow

## 📈 Expected Benefits

### Performance Improvements
- **Bulk QR Generation**: 75% faster (45s → 15s)
- **Analytics Tracking**: 60% faster (500ms → 100ms)
- **Notification Delivery**: 70% faster (5s → 1s)
- **File Processing**: 65% faster (10s → 3s)

### Scalability Gains
- **10x throughput** increase for concurrent operations
- **40% reduction** in database load
- **Real-time updates** instead of polling
- **Fault tolerance** with automatic retry

## 🔧 Development Integration

### Adding Stream Processing to Service

1. **Install Kafka Client**:
```bash
cd services/your-service
npm install kafkajs
npm install @types/kafkajs --save-dev
```

2. **Create Event Producer**:
```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'your-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

export async function publishEvent(topic: string, event: any) {
  await producer.send({
    topic,
    messages: [
      {
        partition: 0,
        key: event.userId,
        value: JSON.stringify(event)
      }
    ]
  });
}
```

3. **Create Event Consumer**:
```typescript
const consumer = kafka.consumer({ groupId: 'your-service-group' });

export async function startConsumer() {
  await consumer.subscribe({ topic: 'your-topic' });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      await handleEvent(event);
    },
  });
}
```

### Event Schema Standards

```typescript
interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  version: string;
  correlationId?: string;
  causationId?: string;
}

interface BulkQRGenerationRequested extends BaseEvent {
  eventType: 'bulk.qr.generation.requested';
  payload: {
    batchId: string;
    userId: string;
    templateId: string;
    itemCount: number;
    priority: 'normal' | 'high';
  };
}
```

## 📊 Monitoring & Alerts

### Key Metrics to Monitor
- Message throughput (messages/second)
- Consumer lag (processing delay)
- Error rates (failed messages %)
- End-to-end latency
- Resource utilization

### Kafka UI Features
- Topic management and configuration
- Consumer group monitoring
- Message browsing and search
- Partition and offset management
- Cluster health overview

### Redis Commander Features
- Stream monitoring
- Consumer group tracking
- Message inspection
- Memory usage analysis
- Connection monitoring

## 🛡️ Production Considerations

### Security
- Enable SASL/SSL for production
- Configure proper authentication
- Set up network security groups
- Enable audit logging

### High Availability
- Multiple Kafka brokers (3+ nodes)
- Replication factor 3
- Cross-zone deployment
- Automated failover

### Backup & Recovery
- Regular topic snapshots
- Offset management
- Consumer group backup
- Schema registry backup

## 🚨 Troubleshooting

### Common Issues

**Kafka not starting:**
```bash
# Check logs
docker logs qr-kafka

# Verify Zookeeper is healthy
docker logs qr-zookeeper
```

**Topics not creating:**
```bash
# Manual topic creation
./stream-manager.sh create-topic test-topic 3 604800000
```

**Consumer lag:**
```bash
# Check consumer group status
./stream-manager.sh describe-group your-group-name

# Reset offsets if needed
./stream-manager.sh reset-group your-group-name topic-name to-latest
```

### Performance Tuning

**High throughput:**
- Increase partitions for parallel processing
- Optimize batch size and linger.ms
- Tune consumer fetch settings

**Low latency:**
- Reduce batch.size and linger.ms
- Increase network threads
- Optimize consumer group configuration

## 📚 Additional Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Redis Streams Guide](https://redis.io/docs/data-types/streams/)
- [Confluent Platform](https://docs.confluent.io/)
- [Stream Processing Patterns](https://www.confluent.io/blog/event-streaming-patterns/)

---

**Next Steps**: Begin implementing Phase 1 services with stream processing integration. Start with the bulk QR generation system for maximum impact.