#!/bin/bash

# QR SaaS Stream Processing Management Script
# Manages Kafka topics, Redis streams, and monitoring

set -e

KAFKA_CONTAINER="qr-kafka"
REDIS_CONTAINER="qr_saas-redis-1"
KAFKA_BOOTSTRAP="localhost:9092"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Start streaming infrastructure
start_infrastructure() {
    log_info "Starting QR SaaS streaming infrastructure..."
    
    # Start core services first
    docker-compose up -d postgres redis zookeeper
    log_info "Started core services (PostgreSQL, Redis, Zookeeper)"
    
    # Wait for Zookeeper
    log_info "Waiting for Zookeeper to be ready..."
    sleep 10
    
    # Start Kafka
    docker-compose up -d kafka
    log_info "Started Kafka broker"
    
    # Wait for Kafka
    log_info "Waiting for Kafka to be ready..."
    sleep 15
    
    # Start Schema Registry
    docker-compose up -d schema-registry
    log_info "Started Schema Registry"
    
    # Wait for Schema Registry
    sleep 10
    
    # Start management tools
    docker-compose up -d kafka-ui redis-commander
    log_info "Started management tools"
    
    # Create topics
    docker-compose up kafka-topics-init
    
    log_success "Streaming infrastructure started successfully!"
    log_info "Kafka UI: http://localhost:8080"
    log_info "Redis Commander: http://localhost:8082"
    log_info "Schema Registry: http://localhost:8081"
}

# Stop streaming infrastructure
stop_infrastructure() {
    log_info "Stopping QR SaaS streaming infrastructure..."
    docker-compose down
    log_success "Infrastructure stopped successfully!"
}

# List Kafka topics
list_topics() {
    log_info "Listing Kafka topics..."
    docker exec -it $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BOOTSTRAP --list
}

# Create a new topic
create_topic() {
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 create-topic <topic-name> [partitions] [retention-ms]"
        exit 1
    fi
    
    local topic_name=$1
    local partitions=${2:-3}
    local retention=${3:-604800000}  # 7 days default
    
    log_info "Creating topic: $topic_name with $partitions partitions"
    docker exec -it $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BOOTSTRAP \
        --create --topic $topic_name --partitions $partitions --replication-factor 1 \
        --config retention.ms=$retention
    
    log_success "Topic $topic_name created successfully!"
}

# Delete a topic
delete_topic() {
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 delete-topic <topic-name>"
        exit 1
    fi
    
    local topic_name=$1
    log_warning "Deleting topic: $topic_name"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker exec -it $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BOOTSTRAP \
            --delete --topic $topic_name
        log_success "Topic $topic_name deleted successfully!"
    else
        log_info "Topic deletion cancelled"
    fi
}

# Show topic details
describe_topic() {
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 describe-topic <topic-name>"
        exit 1
    fi
    
    local topic_name=$1
    log_info "Describing topic: $topic_name"
    docker exec -it $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BOOTSTRAP \
        --describe --topic $topic_name
}

# List consumer groups
list_consumer_groups() {
    log_info "Listing Kafka consumer groups..."
    docker exec -it $KAFKA_CONTAINER kafka-consumer-groups --bootstrap-server $KAFKA_BOOTSTRAP --list
}

# Show consumer group details
describe_consumer_group() {
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 describe-group <group-name>"
        exit 1
    fi
    
    local group_name=$1
    log_info "Describing consumer group: $group_name"
    docker exec -it $KAFKA_CONTAINER kafka-consumer-groups --bootstrap-server $KAFKA_BOOTSTRAP \
        --describe --group $group_name
}

# Reset consumer group offset
reset_consumer_group() {
    if [ $# -lt 2 ]; then
        log_error "Usage: $0 reset-group <group-name> <topic-name> [to-earliest|to-latest|to-offset]"
        exit 1
    fi
    
    local group_name=$1
    local topic_name=$2
    local reset_type=${3:-to-latest}
    
    log_warning "Resetting consumer group $group_name for topic $topic_name to $reset_type"
    read -p "Are you sure? This will reset all offsets! (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker exec -it $KAFKA_CONTAINER kafka-consumer-groups --bootstrap-server $KAFKA_BOOTSTRAP \
            --group $group_name --reset-offsets --topic $topic_name --$reset_type --execute
        log_success "Consumer group offsets reset successfully!"
    else
        log_info "Reset cancelled"
    fi
}

# Send test message to topic
send_test_message() {
    if [ $# -lt 2 ]; then
        log_error "Usage: $0 test-message <topic-name> <message>"
        exit 1
    fi
    
    local topic_name=$1
    local message=$2
    
    log_info "Sending test message to topic: $topic_name"
    echo "$message" | docker exec -i $KAFKA_CONTAINER kafka-console-producer \
        --bootstrap-server $KAFKA_BOOTSTRAP --topic $topic_name
    log_success "Message sent successfully!"
}

# Consume messages from topic
consume_messages() {
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 consume <topic-name> [from-beginning]"
        exit 1
    fi
    
    local topic_name=$1
    local from_beginning=${2:-""}
    local additional_args=""
    
    if [ "$from_beginning" = "from-beginning" ]; then
        additional_args="--from-beginning"
    fi
    
    log_info "Consuming messages from topic: $topic_name (Press Ctrl+C to stop)"
    docker exec -it $KAFKA_CONTAINER kafka-console-consumer \
        --bootstrap-server $KAFKA_BOOTSTRAP --topic $topic_name $additional_args
}

# Check Kafka health
check_kafka_health() {
    log_info "Checking Kafka cluster health..."
    
    # Check if Kafka is responding
    if docker exec $KAFKA_CONTAINER kafka-broker-api-versions --bootstrap-server $KAFKA_BOOTSTRAP > /dev/null 2>&1; then
        log_success "Kafka broker is healthy"
    else
        log_error "Kafka broker is not responding"
        return 1
    fi
    
    # Check topic count
    local topic_count=$(docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BOOTSTRAP --list 2>/dev/null | wc -l)
    log_info "Total topics: $topic_count"
    
    # Check consumer groups
    local group_count=$(docker exec $KAFKA_CONTAINER kafka-consumer-groups --bootstrap-server $KAFKA_BOOTSTRAP --list 2>/dev/null | wc -l)
    log_info "Total consumer groups: $group_count"
}

# Check Redis health
check_redis_health() {
    log_info "Checking Redis health..."
    
    if docker exec $REDIS_CONTAINER redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is healthy"
        
        # Show Redis info
        local memory_usage=$(docker exec $REDIS_CONTAINER redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        local connected_clients=$(docker exec $REDIS_CONTAINER redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
        
        log_info "Memory usage: $memory_usage"
        log_info "Connected clients: $connected_clients"
    else
        log_error "Redis is not responding"
        return 1
    fi
}

# Show comprehensive health status
health_check() {
    log_info "=== QR SaaS Streaming Health Check ==="
    check_kafka_health
    echo
    check_redis_health
    echo
    log_info "=== Service URLs ==="
    log_info "Kafka UI: http://localhost:8080"
    log_info "Redis Commander: http://localhost:8082"
    log_info "Schema Registry: http://localhost:8081"
}

# Show help
show_help() {
    echo "QR SaaS Stream Processing Management Script"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Infrastructure Commands:"
    echo "  start                     Start streaming infrastructure"
    echo "  stop                      Stop streaming infrastructure" 
    echo "  health                    Check health of all services"
    echo
    echo "Kafka Topic Commands:"
    echo "  list-topics               List all Kafka topics"
    echo "  create-topic <name> [partitions] [retention-ms]"
    echo "                           Create a new topic"
    echo "  delete-topic <name>       Delete a topic"
    echo "  describe-topic <name>     Show topic details"
    echo
    echo "Kafka Consumer Commands:"
    echo "  list-groups               List consumer groups"
    echo "  describe-group <name>     Show consumer group details"
    echo "  reset-group <group> <topic> [reset-type]"
    echo "                           Reset consumer group offsets"
    echo
    echo "Testing Commands:"
    echo "  test-message <topic> <message>    Send test message"
    echo "  consume <topic> [from-beginning]  Consume messages"
    echo
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 create-topic user-events 5 86400000"
    echo "  $0 test-message analytics-events '{\"event\":\"test\"}'"
    echo "  $0 consume analytics-events from-beginning"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        "start")
            start_infrastructure
            ;;
        "stop")
            stop_infrastructure
            ;;
        "list-topics")
            list_topics
            ;;
        "create-topic")
            create_topic "${@:2}"
            ;;
        "delete-topic")
            delete_topic "${@:2}"
            ;;
        "describe-topic")
            describe_topic "${@:2}"
            ;;
        "list-groups")
            list_consumer_groups
            ;;
        "describe-group")
            describe_consumer_group "${@:2}"
            ;;
        "reset-group")
            reset_consumer_group "${@:2}"
            ;;
        "test-message")
            send_test_message "${@:2}"
            ;;
        "consume")
            consume_messages "${@:2}"
            ;;
        "health")
            health_check
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"