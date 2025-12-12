const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4444;
const SECRET_KEY = 'enhypen_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos simulada en archivo JSON
const DB_FILE = path.join(__dirname, 'database.json');

// Inicializar base de datos
function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            purchases: [],
            products: [
                {
                    id: 1,
                    name: "DIMENSION: DILEMMA Album",
                    price: 25.99,
                    category: "albums",
                    emoji: "💿",
                    description: "Álbum completo con photobook exclusivo",
                    stock: 100
                },
                {
                    id: 2,
                    name: "Hoodie Oficial ENHYPEN",
                    price: 55.00,
                    category: "clothing",
                    emoji: "👕",
                    description: "Sudadera oficial con capucha",
                    stock: 50
                },
                {
                    id: 3,
                    name: "Lightstick ENHYPEN Official",
                    price: 45.00,
                    category: "accessories",
                    emoji: "✨",
                    description: "Lightstick oficial para conciertos",
                    stock: 75
                }
            ]
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Leer base de datos
function readDatabase() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

// Escribir en base de datos
function writeDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// ==================== RUTAS ====================

// Ruta de prueba
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ENHYPEN Store API</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                h1 { text-align: center; }
                .endpoint {
                    background: rgba(255,255,255,0.1);
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                }
                .method {
                    display: inline-block;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-weight: bold;
                    margin-right: 10px;
                }
                .get { background: #4CAF50; }
                .post { background: #2196F3; }
                .put { background: #FF9800; }
                .delete { background: #f44336; }
            </style>
        </head>
        <body>
            <h1>🎵 ENHYPEN Store API</h1>
            <h2>Servidor corriendo en puerto ${PORT}</h2>
            
            <h3>📋 Endpoints Disponibles:</h3>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>/api/register</strong> - Registrar nuevo usuario
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>/api/login</strong> - Iniciar sesión
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/user/profile</strong> - Obtener perfil (requiere token)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/products</strong> - Listar todos los productos
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/products/:id</strong> - Obtener producto específico
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>/api/purchase</strong> - Crear nueva compra (requiere token)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/user/purchases</strong> - Ver historial de compras (requiere token)
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/user/stats</strong> - Estadísticas del usuario (requiere token)
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
                ✅ Servidor funcionando correctamente<br>
                📅 ${new Date().toLocaleString()}
            </p>
        </body>
        </html>
    `);
});

// REGISTRO
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const db = readDatabase();

        // Verificar si el email ya existe
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: db.users.length + 1,
            name,
            email,
            password: hashedPassword,
            registeredAt: new Date().toISOString(),
            totalSpent: 0,
            totalPurchases: 0
        };

        db.users.push(newUser);
        writeDatabase(db);

        // Generar token
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY, { expiresIn: '7d' });

        res.json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                registeredAt: newUser.registeredAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const db = readDatabase();
        const user = db.users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '7d' });

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                registeredAt: user.registeredAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// OBTENER PERFIL DE USUARIO
app.get('/api/user/profile', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        const user = db.users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            registeredAt: user.registeredAt,
            totalSpent: user.totalSpent,
            totalPurchases: user.totalPurchases
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// LISTAR PRODUCTOS
app.get('/api/products', (req, res) => {
    try {
        const db = readDatabase();
        res.json(db.products);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// OBTENER PRODUCTO ESPECÍFICO
app.get('/api/products/:id', (req, res) => {
    try {
        const db = readDatabase();
        const product = db.products.find(p => p.id === parseInt(req.params.id));

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// CREAR COMPRA
app.post('/api/purchase', authenticateToken, (req, res) => {
    try {
        const { items } = req.body; // items: [{ productId, quantity }]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items inválidos' });
        }

        const db = readDatabase();
        const user = db.users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        let totalAmount = 0;
        const purchaseItems = [];

        // Validar productos y calcular total
        for (const item of items) {
            const product = db.products.find(p => p.id === item.productId);
            
            if (!product) {
                return res.status(404).json({ error: `Producto ${item.productId} no encontrado` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Stock insuficiente para ${product.name}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            purchaseItems.push({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: item.quantity,
                emoji: product.emoji,
                subtotal: itemTotal
            });

            // Actualizar stock
            product.stock -= item.quantity;
        }

        // Crear registro de compra
        const purchase = {
            id: db.purchases.length + 1,
            userId: user.id,
            items: purchaseItems,
            totalAmount,
            purchaseDate: new Date().toISOString(),
            status: 'completed'
        };

        db.purchases.push(purchase);

        // Actualizar estadísticas del usuario
        user.totalSpent += totalAmount;
        user.totalPurchases += 1;

        writeDatabase(db);

        res.json({
            message: 'Compra realizada exitosamente',
            purchase
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// HISTORIAL DE COMPRAS
app.get('/api/user/purchases', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        const userPurchases = db.purchases.filter(p => p.userId === req.user.id);

        res.json(userPurchases);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// ESTADÍSTICAS DEL USUARIO
app.get('/api/user/stats', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        const user = db.users.find(u => u.id === req.user.id);
        const userPurchases = db.purchases.filter(p => p.userId === req.user.id);

        const totalItems = userPurchases.reduce((sum, purchase) => {
            return sum + purchase.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);

        res.json({
            totalPurchases: user.totalPurchases,
            totalSpent: user.totalSpent,
            totalItems,
            memberSince: user.registeredAt,
            lastPurchase: userPurchases.length > 0 ? userPurchases[userPurchases.length - 1].purchaseDate : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
});

// Inicializar base de datos y servidor
initDatabase();

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   🎵 ENHYPEN STORE SERVER                ║
║   ✅ Servidor corriendo en puerto ${PORT}    ║
║   🌐 http://localhost:${PORT}                ║
║   📅 ${new Date().toLocaleString()}      ║
╚═══════════════════════════════════════════╝
    `);
});