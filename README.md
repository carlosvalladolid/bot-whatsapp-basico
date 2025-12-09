# Bot WhatsApp Básico

Un bot sencillo que recibe mensajes de WhatsApp y responde automáticamente.

## 📋 Requisitos

- Node.js 16+
- npm o yarn
- WhatsApp instalado en tu teléfono

## 🚀 Instalación y ejecución

### Paso 1: Instalar dependencias

```bash
npm install
```

**¿Qué estamos instalando?**
- **@whiskeysockets/baileys**: Librería que controla WhatsApp Web (para enviar/recibir mensajes)
- **dotenv**: Para cargar variables de entorno desde el archivo `.env`
- **qrcode-terminal**: Para mostrar el código QR en la terminal

### Paso 2: Ejecutar el bot

```bash
npm start
```

### Paso 3: Autenticarse

1. El bot mostrará un **código QR en la terminal**
2. Abre **WhatsApp en tu teléfono**
3. Ve a: **Configuración → Dispositivos vinculados → Vincular un dispositivo**
4. **Escanea el QR** con tu cámara
5. El bot debería conectarse automáticamente

### Paso 4: Probar el bot

1. Envía un mensaje a tu número (o al del bot si es vinculado)
2. El bot debería responder automáticamente

## 📁 Estructura del proyecto

```
bot-whatsapp-basico/
├── app.js              # Archivo principal del bot
├── package.json        # Dependencias del proyecto
├── .env                # Variables de entorno
├── README.md           # Este archivo
└── sessions/           # (Se crea automáticamente) Almacena la sesión autenticada
```

## 🔧 Cómo funciona

### Recibir mensajes

El evento `messages.upsert` se dispara cuando llega un mensaje:

```javascript
sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0]
    const sender = message.key.remoteJid
    const text = message.message.conversation
    
    console.log(`Mensaje de ${sender}: ${text}`)
})
```

### Enviar mensajes

Para enviar un mensaje:

```javascript
await sock.sendMessage('123456789@s.whatsapp.net', { 
    text: 'Hola, este es un mensaje de prueba' 
})
```

## 🎯 Próximas mejoras

Puedes extender este bot para:
- ✅ Responder según palabras clave
- ✅ Guardar mensajes en una base de datos
- ✅ Integrar con una API REST
- ✅ Manejar imágenes y archivos
- ✅ Crear comandos personalizados

## 📝 Notas importantes

- La sesión se guarda en la carpeta `sessions/` automáticamente
- Una vez autenticado, no necesitas escanear el QR nuevamente
- Para desconectarte, presiona `Ctrl+C` en la terminal
- Para reiniciar, borra la carpeta `sessions/` y ejecuta `npm start` nuevamente

## ❓ Troubleshooting

**¿El QR no aparece?**
- Asegúrate de que la terminal es lo suficientemente ancha
- Intenta ejecutar `npm start` nuevamente

**¿El bot no responde?**
- Verifica que esté conectado (debería ver "✅ ¡Conectado a WhatsApp!")
- Espera unos segundos después de escanear el QR

**¿Necesito desconectar el bot?**
- Presiona `Ctrl+C` en la terminal
- El bot se cerrará elegantemente

## 📞 Contacto

Para más información, consulta la documentación de Baileys:
https://github.com/WhiskeySockets/Baileys
