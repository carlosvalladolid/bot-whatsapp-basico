import makeWASocket, {
    Browsers,
    DisconnectReason,
    useMultiFileAuthState
} from 'baileys'
import QRCode from 'qrcode-terminal'
import 'dotenv/config.js'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import fetch from 'node-fetch'

const PORT = process.env.PORT || 3000
const SERVER_NUMBER = "8124267007" // Número de servidor para enviar a la API

// Crear carpeta para guardar la sesión
const sessionPath = join(process.cwd(), 'sessions_v7_test')
if (!existsSync(sessionPath)) {
    mkdirSync(sessionPath, { recursive: true })
}

let sock = null
let isStarting = false
let reconnectTimer = null

// ==================== VARIABLES GLOBALES ====================
let lastApiMessageDate = null  // Almacena la fecha y hora del último mensaje que consumió API
let lastApiMessage = null      // Almacena el contenido del último mensaje que consumió API
let lastFiveMessages = []      // Array que almacena los últimos 5 mensajes

// ==================== FUNCIONES DE FLUJOS ====================

function getFormattedDateTime() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Función para agregar un mensaje al array de últimos 5 mensajes
 * @param {string} message - El mensaje a agregar
 */
function addMessageToHistory(message) {
    lastFiveMessages.push(message)
    // Mantener solo los últimos 5 mensajes
    if (lastFiveMessages.length > 5) {
        lastFiveMessages.shift() // Eliminar el primero (más antiguo)
    }
}

/**
 * Función para llamar a una API web
 * @param {string} url - URL de la API
 * @param {string} message - Mensaje a enviar
 * @returns {Promise} Respuesta de la API
 */
async function callWebApi(url, message) {
    try {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, serverNumber: SERVER_NUMBER })
        }

        const response = await fetch(url, options)
        const data = await response.json()
        return data
    } catch (error) {
        console.error('❌ Error al llamar API:', error.message)
        return null
    }
}

/**
 * Flow Principal - Se activa con la palabra "Status"
 */
async function flowPrincipal(sender, messageText) {
    try {
        const response = '🟢 Corriendo...'
        await sock.sendMessage(sender, { text: response })
        console.log(`✅ Flow Principal respondido a ${sender}`)
    } catch (error) {
        console.error(`❌ Error en flowPrincipal: ${error.message}`)
    }
}

/**
 * Flow Status - Se activa cuando el mensaje contiene "Su solicitud"
 */
async function flowStatus(sender, messageText) {
    try {
        const response = `SI-${SERVER_NUMBER}`
        await sock.sendMessage(sender, { text: response })
        console.log(`✅ Flow Status respondido a ${sender}`)
    } catch (error) {
        console.error(`❌ Error en flowStatus: ${error.message}`)
    }
}

/**
 * Flow Last Message Date - Se activa cuando el mensaje contiene "Last message date"
 * Retorna la fecha y hora del último mensaje que consumió la API
 */
async function flowLastMessageDate(sender, messageText) {
    try {
        let response
        if (lastApiMessageDate) {
            response = `La fecha y hora del último mensaje fue: ${lastApiMessageDate}`
        } else {
            response = `No hay registro de mensajes anteriores que hayan consumido la API.`
        }
        await sock.sendMessage(sender, { text: response })
        console.log(`✅ Flow Last Message Date respondido a ${sender}`)
    } catch (error) {
        console.error(`❌ Error en flowLastMessageDate: ${error.message}`)
    }
}

/**
 * Flow Last Message - Se activa cuando el mensaje contiene "Last message"
 * Retorna el contenido del último mensaje que consumió la API
 */
async function flowLastMessage(sender, messageText) {
    try {
        let response
        if (lastApiMessage) {
            response = `El último mensaje fue: ${lastApiMessage}`
        } else {
            response = `No hay registro de mensajes anteriores que hayan consumido la API.`
        }
        await sock.sendMessage(sender, { text: response })
        console.log(`✅ Flow Last Message respondido a ${sender}`)
    } catch (error) {
        console.error(`❌ Error en flowLastMessage: ${error.message}`)
    }
}

/**
 * Flow Five Last Messages - Se activa cuando el mensaje contiene "Five last messages"
 * Retorna los últimos 5 mensajes recibidos
 */
async function flowFiveLastMessages(sender, messageText) {
    try {
        let response
        if (lastFiveMessages.length > 0) {
            response = `📋 Últimos ${lastFiveMessages.length} mensaje(s):\n\n`
            lastFiveMessages.forEach((msg, index) => {
                response += `${index + 1}. ${msg}\n`
            })
        } else {
            response = `No hay registros de mensajes anteriores.`
        }
        await sock.sendMessage(sender, { text: response })
        console.log(`✅ Flow Five Last Messages respondido a ${sender}`)
    } catch (error) {
        console.error(`❌ Error en flowFiveLastMessages: ${error.message}`)
    }
}

/**
 * Flow Bienvenida - Se activa cuando el mensaje contiene "911-USAMEX"
 * Llama a la API web y procesa la respuesta
 */
async function flowBienvenida(sender, messageText) {
    try {
        console.log(`📤 Llamando API para: ${messageText}`)
        
        // Llamar a la API web
        const apiResponse = await callWebApi(
            'https://kipcalm1.azurewebsites.net/Whatsapp/getWhatsappMessage',
            messageText
        )

        console.log(`📥 Respuesta de API: ${JSON.stringify(apiResponse, null, 2)}`)

        // Guardar la fecha y hora del último mensaje que consumió la API
        lastApiMessageDate = getFormattedDateTime()
        // Guardar el contenido del último mensaje que consumió la API
        lastApiMessage = messageText
        console.log(`⏰ Fecha y hora registrada: ${lastApiMessageDate}`)
        console.log(`💾 Mensaje registrado: ${lastApiMessage}`)

        // Responder al usuario con la información del mensaje
        const response = `Tu mensaje es: ${messageText}`
        await sock.sendMessage(sender, { text: response })
        console.log(`✅ Flow Bienvenida respondido a ${sender}`)
    } catch (error) {
        console.error(`❌ Error en flowBienvenida: ${error.message}`)
    }
}

/**
 * Extraer texto de diferentes tipos de mensajes
 * Soporta: mensajes simples, extendidos y plantillas de Meta
 */
function extractMessageText(message) {
    // 1. Mensaje simple de conversación
    if (message.conversation) {
        return message.conversation
    }

    // 2. Mensaje extendido (texto largo)
    if (message.extendedTextMessage?.text) {
        return message.extendedTextMessage.text
    }

    // 3. Mensaje de plantilla de Meta (templateMessage)
    if (message.templateMessage) {
        // 3a. Plantilla interactiva con body.text (Universe)
        if (message.templateMessage.interactiveMessageTemplate?.body?.text) {
            return message.templateMessage.interactiveMessageTemplate.body.text
        }

        // 3b. Plantilla hidratada estándar
        const hydratedTemplate = message.templateMessage.hydratedTemplate
        if (hydratedTemplate) {
            let extractedText = ''
            
            // Extraer el texto del title
            if (hydratedTemplate.hydratedTitleText) {
                extractedText += hydratedTemplate.hydratedTitleText
            }
            
            // Extraer el texto del body
            if (hydratedTemplate.hydratedContentText) {
                if (extractedText) extractedText += ' | '
                extractedText += hydratedTemplate.hydratedContentText
            }
            
            // Extraer el texto del footer
            if (hydratedTemplate.hydratedFooterText) {
                if (extractedText) extractedText += ' | '
                extractedText += hydratedTemplate.hydratedFooterText
            }
            
            // Si se extrajo algo, retornarlo
            if (extractedText) {
                return extractedText
            }
            
            // O intentar extraer del templateText
            if (message.templateMessage.templateText) {
                return message.templateMessage.templateText
            }
        }
    }

    // 4. Mensaje de botones (buttonMessage)
    if (message.buttonMessage?.contentText) {
        return message.buttonMessage.contentText
    }

    // 5. Mensaje de lista (listMessage)
    if (message.listMessage?.description) {
        return message.listMessage.description
    }

    // Si no se puede extraer, retornar vacío
    return ''
}

/**
 * Extraer el número de teléfono real del sender
 * Maneja tanto números normales como LID (Linked ID)
 */
function extractPhoneNumber(sender) {
    // Si es un LID (formato: XXX@lid), retornar como está
    if (sender.includes('@lid')) {
        return sender
    }
    
    // Si es un número normal (formato: 52XXXXXXXXX@s.whatsapp.net), extraer solo el número
    const match = sender.match(/^(\d+)@/)
    if (match) {
        return match[1]
    }
    
    return sender
}

/**
 * Procesar el mensaje y determinar qué flujo activar
 */
async function processMessage(sender, messageText) {
    if (!messageText || messageText.trim() === '') {
        console.log(`⚠️  Mensaje vacío recibido`)
        return
    }

    const messageLower = messageText.toLowerCase()

    // Flow Bienvenida - Prioridad 1 (si contiene "911-USAMEX")
    if (messageLower.includes('911-usamex')) {
        await flowBienvenida(sender, messageText)
        return
    }

    // Flow Five Last Messages - Prioridad 2 (si contiene "five last messages")
    if (messageLower.includes('five last messages')) {
        await flowFiveLastMessages(sender, messageText)
        return
    }

    // Flow Last Message - Prioridad 3 (si contiene "last message" pero NO "last message date")
    if (messageLower.includes('last message') && !messageLower.includes('last message date')) {
        await flowLastMessage(sender, messageText)
        return
    }

    // Flow Last Message Date - Prioridad 4 (si contiene "Last message date")
    if (messageLower.includes('last message date')) {
        await flowLastMessageDate(sender, messageText)
        return
    }

    // Flow Principal - Prioridad 5 (si contiene "Status")
    if (messageLower.includes('status')) {
        await flowPrincipal(sender, messageText)
        return
    }

    // Flow Status - Prioridad 6 (si contiene "Su solicitud")
    if (messageLower.includes('su solicitud')) {
        await flowStatus(sender, messageText)
        return
    }

    // Sin coincidencia - respuesta genérica
    console.log(`⏭️  Mensaje no coincide con ningún flujo`)
}

function closeSocket(socketToClose, reason) {
    if (!socketToClose) return

    socketToClose.ev.removeAllListeners('connection.update')
    socketToClose.ev.removeAllListeners('creds.update')
    socketToClose.ev.removeAllListeners('messages.upsert')

    try {
        socketToClose.end(new Error(reason))
    } catch (error) {
        console.error(`⚠️ Error al cerrar el socket anterior: ${error.message}`)
    }

    if (sock === socketToClose) sock = null
}

function scheduleReconnect(delay, reason) {
    if (reconnectTimer) {
        console.log(`⏭️ Reconexión ignorada; ya existe una pendiente. Motivo nuevo: ${reason}`)
        return
    }

    console.log(`⏳ Reconexión programada en ${delay} ms. Motivo: ${reason}`)
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        console.log(`🔄 Ejecutando reconexión. Motivo: ${reason}`)
        startBot()
    }, delay)
}

async function startBot() {
    if (isStarting) {
        console.log('⏭️ Intento de startBot ignorado; ya hay otro inicio en curso')
        return
    }

    isStarting = true
    let newSocket = null

    try {
        console.log('🚀 Iniciando nuevo socket de WhatsApp...')

        if (sock) {
            console.log('🧹 Cerrando y limpiando el socket anterior antes de crear uno nuevo')
            closeSocket(sock, 'Reemplazo controlado del socket')
        }
        
        // Cargar estado de autenticación
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

        // Crear conexión con WhatsApp
        newSocket = makeWASocket({
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            retryRequestDelayMs: 250,
            connectTimeoutMs: 60000,
        })
        sock = newSocket

        // Evento: Actualización de conexión (incluye QR)
        newSocket.ev.on('connection.update', async (update) => {
            if (sock !== newSocket) return

            const { connection, lastDisconnect, qr } = update

            // Mostrar QR en terminal
            if (qr) {
                console.log('\n' + '='.repeat(50))
                console.log('📱 ESCANEA ESTE QR CON WHATSAPP')
                console.log('='.repeat(50))
                QRCode.generate(qr, { small: true })
                console.log('='.repeat(50) + '\n')
            }

            // Manejar desconexión
            if (connection === 'close') {
                const disconnectError = lastDisconnect?.error
                const statusCode = disconnectError?.output?.statusCode ?? disconnectError?.statusCode
                console.log(`⚠️ Conexión cerrada. Código de desconexión: ${statusCode ?? 'desconocido'}`)

                if (statusCode === DisconnectReason.loggedOut) {
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer)
                        reconnectTimer = null
                    }
                    closeSocket(newSocket, 'Sesión cerrada mediante loggedOut')
                    console.log('❌ Sesión cerrada mediante loggedOut; no se reconectará automáticamente. Es necesario volver a vincularla.')
                    return
                }

                if (statusCode === DisconnectReason.restartRequired) {
                    scheduleReconnect(1000, `Baileys solicitó reinicio (${statusCode})`)
                    return
                }

                scheduleReconnect(3000, `desconexión recuperable (${statusCode ?? 'código desconocido'})`)
            }

            // Manejar conexión exitosa
            if (connection === 'open') {
                console.log('✅ Conexión de WhatsApp abierta')
                console.log(`📱 Número: ${newSocket.user.id}`)
            }
        })

        // Evento: Guardar credenciales cuando se actualicen
        newSocket.ev.on('creds.update', saveCreds)

        // Evento: Recibir mensajes
        newSocket.ev.on('messages.upsert', async (m) => {
            if (sock !== newSocket) return

            const message = m.messages[0]
            
            // Ignorar mensajes que ya fueron respondidos o mensajes propios
            if (message.key.fromMe) return
            if (!message.message) return

            // Extraer información del mensaje
            const sender = message.key.remoteJid
            const phoneNumber = extractPhoneNumber(sender)
            const receivedMessage = extractMessageText(message.message)

            // Almacenar el mensaje en una variable
            console.log(`\n📨 Mensaje recibido:`)
            console.log(`   De (ID): ${sender}`)
            console.log(`   De (Teléfono): ${phoneNumber}`)
            console.log(`   Tipo: ${Object.keys(message.message)[0]}`)
            console.log(`   Texto: ${receivedMessage}`)
            
            // DEBUG: Imprimir la estructura completa del mensaje (comentado)
            // console.log(`\n🔍 ESTRUCTURA DEL MENSAJE (DEBUG):`)
            // console.log(JSON.stringify(message.message, null, 2))
            // console.log(`\n`)

            // Agregar el mensaje al historial de últimos 5 mensajes (solo si no está vacío)
            if (receivedMessage.trim() !== '') {
                addMessageToHistory(receivedMessage)
                console.log(`📚 Historial actualizado (${lastFiveMessages.length}/5)`)
            } else {
                console.log(`⚠️  Mensaje vacío, no se agregó al historial`)
            }

            // Procesar el mensaje y activar el flujo correspondiente
            await processMessage(sender, receivedMessage)
        })

        isStarting = false

    } catch (error) {
        console.error('⚡ Error:', error.message)
        console.error('Detalles:', error.stack)
        
        isStarting = false
        closeSocket(newSocket, 'Limpieza después de un error durante el inicio')
        scheduleReconnect(10000, `error al iniciar el socket: ${error.message}`)
    }
}

// Iniciar el bot
startBot()

// Manejar cierre elegante
process.on('SIGINT', async () => {
    console.log('\n👋 Cerrando bot...')
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    closeSocket(sock, 'Cierre del usuario')
    process.exit(0)
})
