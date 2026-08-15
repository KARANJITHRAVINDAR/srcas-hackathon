# Build Stage
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build production package
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Install native Tesseract OCR engine, English traineddata, and native libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        libtesseract-dev \
        ghostscript && \
    rm -rf /var/lib/apt/lists/*

# Set Tesseract data directory environment variable
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata/

# Create directory for file uploads
RUN mkdir -p /app/uploads

# Copy built JAR artifact from build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
