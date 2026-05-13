# 🏪 POS System

Sistema de punto de venta completo, modular y personalizable.
Desplegable en **Docker Desktop + WSL** con un solo comando.

## Módulos
- 🛒 POS — Punto de venta con carrito, ticket e IVA
- 📦 Inventario — Entradas, salidas y alertas de stock
- 💰 Corte de caja — Resumen del día y cuadre
- 🏷️ Productos — Catálogo con imágenes, categorías e IVA
- 👥 Clientes — Base de datos con historial
- 🚚 Proveedores — Gestión de contactos
- 📊 Reportes — Dashboard con gráficas
- ⚙️ Configuración — Logo, colores, IVA, tipo de negocio

## Requisitos
- Windows 10/11 con WSL2 (Ubuntu 22.04 o 24.04)
- Docker Desktop con integración WSL habilitada
- Git

## Instalación (un solo comando)
```bash
git clone https://github.com/TU_USUARIO/pos-system.git
cd pos-system
chmod +x setup_all.sh
bash setup_all.sh
```

Abre en tu navegador: **http://localhost:3000**

## URLs
| Servicio | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API REST | http://localhost:8000/api |
| API Docs | http://localhost:8000/docs |
| MinIO | http://localhost:9001 |

## Stack
FastAPI · React 18 · PostgreSQL 15 · MinIO · Docker Compose · K3s
