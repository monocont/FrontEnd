# Integración de Google Sign-In: Angular 20 + .NET 10

## 1. Contexto y Herramientas
El objetivo es implementar un inicio de sesión seguro donde Google actúa como proveedor de identidad externo, pero el control de acceso final recae sobre tu propia arquitectura. 

**Librerías y SDKs a utilizar:**
* **Frontend (Angular 20):** Se utilizará el script nativo **Google Identity Services (GIS)** (`https://accounts.google.com/gsi/client`). Es una solución ligera proporcionada directamente por Google que evita instalar paquetes de terceros, manteniendo el bundle limpio.
* **Backend (.NET 10):** Se utilizará el paquete oficial **`Google.Apis.Auth`** de NuGet. Este SDK es indispensable porque se encarga de validar matemáticamente la firma criptográfica del token proporcionado por Google, asegurando que no haya sido falsificado.

---

## 2. Flujo de Funcionamiento
1. El usuario interactúa con el botón oficial de Google renderizado por el script de GIS en el frontend.
2. Tras autenticarse en la ventana de Google, Google emite un token JWT (una credencial temporal) directamente al frontend.
3. El frontend intercepta este token y lo envía de inmediato al backend mediante una petición HTTP (no lo utiliza para iniciar la sesión de la aplicación).
4. El backend recibe el token y usa su SDK de Google para verificar su autenticidad, integridad y vigencia con los servidores de Google.
5. Una vez validado el token, el backend extrae el correo del usuario, lo integra a su lógica de dominio y emite un token JWT interno y definitivo.
6. El frontend recibe este nuevo token interno y lo utiliza para todas las futuras peticiones al ecosistema de microservicios.

---

## 3. Pasos a realizar en el Frontend (Angular 20)
1. **Configuración en GCP:** Registrar la aplicación web en la Consola de Google Cloud, configurando los orígenes autorizados para obtener un *Client ID*.
2. **Inyección del Script:** Agregar el script oficial de Google Identity Services globalmente en el proyecto.
3. **Renderizado de Interfaz:** Crear un componente que inicialice la librería de Google con el *Client ID* y renderice el botón de inicio de sesión en un contenedor HTML específico.
4. **Captura de Respuesta:** Configurar la función de *callback*. Cuando el usuario inicie sesión con éxito en la ventana de Google, esta función capturará automáticamente el token JWT resultante.
5. **Delegación al Backend:** Tomar ese token y enviarlo a través de un servicio HTTP hacia el endpoint público de autenticación del backend.

---

## 4. Pasos a realizar en el Backend (.NET 10)
1. **Configuración del Proyecto:** Instalar el paquete `Google.Apis.Auth` en el proyecto que manejará la identidad.
2. **Recepción de la Petición:** Crear un endpoint público (ej. POST `/api/auth/google`) configurado para recibir el token enviado por Angular.
3. **Validación de Seguridad:** Pasar el token recibido al método de validación del SDK de Google (`GoogleJsonWebSignature.ValidateAsync`), indicando el *Client ID* de la aplicación. El SDK validará la firma y lanzará una excepción si el token es inválido o expiró.
4. **Persistencia y Lógica de Dominio:** Extraer la información del usuario (como el correo electrónico) del token ya validado. Consultar la base de datos (PostgreSQL) para verificar si el usuario existe en el sistema. Si es nuevo, se ejecuta el registro automático.
5. **Transición de Identidad (Janus):** Descartar el token de Google. El sistema centralizado de identidad procede a generar un nuevo token JWT propio, incluyendo los *claims*, roles y permisos específicos de la arquitectura de la aplicación.
6. **Respuesta Exitosa:** Devolver el token generado por el sistema de vuelta al frontend para que inicie la sesión de forma oficial.