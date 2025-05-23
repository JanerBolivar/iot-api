# iot-api

Este repositorio contiene el código de la API de IoT desarrollada por Janer Muñoz.

## Descripción del Proyecto

Este proyecto es una API (Interfaz de Programación de Aplicaciones) diseñada para facilitar la interacción y gestión de dispositivos y datos de Internet de las Cosas (IoT). Construida con JavaScript, busca proporcionar una plataforma robusta y flexible para diversas aplicaciones de IoT.

## Características

* **Tecnología Base:** JavaScript
    * Gestión de dispositivos (registro, estado, etc.)
    * Recolección y almacenamiento de datos de sensores
    * Envío de comandos a dispositivos
    * Autenticación y autorización
    * Soporte para protocolos específicos de IoT (WebSocket, HTTP/REST.)

## Tecnologías Utilizadas

* JavaScript
    * Node.js
    * Express.js
    * Base de datos (MySQL)
    * WebSocket.js
    * Sequelize.js

## Instalación y Configuración

Sigue estos pasos para configurar y ejecutar el proyecto localmente:

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/JanerBolivar/iot-api.git](https://github.com/JanerBolivar/iot-api.git)
    cd iot-api
    ```
2.  **Instala las dependencias:**
    ```bash
    npm install
    ```
3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto y añade las variables necesarias .

    ```
    # Ejemplo de .env
    # Database
    DB_DATABASE=name_database
    DB_USER=user_database
    DB_PASSWORD=password_database
    DB_HOST=host_database
    DB_PORT=3306
    DB_DIALECT=mysql

    # JWT
    JWT_SECRET=11111
    JWT_EXPIRES_IN=1h
    
    # Server
    PORT=3000
    BASE_URL=http://localhost:3000/api-doc
    ```

4.  **Ejecuta la API:**
    ```bash
    npm start
    # npm run dev
    ```
    La API estará disponible en `http://localhost:PUERTO` (el puerto que configuraste en `.env`, por defecto `3000`).

## Licencia

Derechos reservados para Janer Fabian Muñoz.

## Contacto

Si tienes alguna pregunta o sugerencia, puedes contactar a Janer Muñoz atraves de janerfabian83@gmail.com

---
