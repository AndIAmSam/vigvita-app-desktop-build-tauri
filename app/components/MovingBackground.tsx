import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, ScaledSize } from 'react-native';

// --- CONFIGURACIÓN ESTILO "ATMOSFÉRICO" ---
const NUM_BLOBS = 6; // Cantidad de manchas
const MIN_SPEED = 0.5; // Velocidad muy lenta para que sea elegante
const MAX_SPEED = 1.5;

// Colores exactos de tu marca
const COLORS = [
    '#2665ad', // Azul 1
    '#8cbe27', // Verde
];

// Definición de un "Blob"
interface Blob {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number; // Agregamos opacidad individual
}

export const MovingBackground = () => {
    const dimensionsStr = useRef(Dimensions.get('window'));
    const [blobs, setBlobs] = useState<Blob[]>([]);

    // CORRECCIÓN DETALLE 1: Inicializamos con 0 para calmar a TypeScript
    const requestRef = useRef<number>(0);

    // 1. Inicializar los Blobs con estilo "Gigante y Sutil"
    useEffect(() => {
        const { width, height } = dimensionsStr.current;

        const newBlobs: Blob[] = Array.from({ length: NUM_BLOBS }).map((_, i) => {
            // CORRECCIÓN DETALLE 2: Tamaños grandes (300 a 700) y opacidades bajas
            const size = Math.random() * 300 + 200;
            const opacity = Math.random() * 0.1 + 0.3; // Entre 0.08 y 0.16 (Muy sutil)

            return {
                id: i,
                // Posición inicial aleatoria (permitiendo que salgan un poco de pantalla)
                x: Math.random() * width - (size / 2),
                y: Math.random() * height - (size / 2),
                // Velocidad
                vx: (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED) * (Math.random() < 0.5 ? -1 : 1),
                vy: (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED) * (Math.random() < 0.5 ? -1 : 1),
                size,
                color: COLORS[i % COLORS.length],
                opacity
            };
        });
        setBlobs(newBlobs);

        const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
            dimensionsStr.current = window;
        });

        return () => subscription?.remove();
    }, []);

    // 2. Bucle de animación
    const animate = () => {
        const { width, height } = dimensionsStr.current;

        setBlobs(prevBlobs => prevBlobs.map(blob => {
            let { x, y, vx, vy, size } = blob;

            x += vx;
            y += vy;

            // Rebote suave en los bordes (permitiendo que se escondan un poco)
            // Límite izquierdo/derecho
            if (x < -size / 2) {
                x = -size / 2;
                vx = -vx;
            } else if (x > width - size / 2) {
                x = width - size / 2;
                vx = -vx;
            }

            // Límite arriba/abajo
            if (y < -size / 2) {
                y = -size / 2;
                vy = -vy;
            } else if (y > height - size / 2) {
                y = height - size / 2;
                vy = -vy;
            }

            return { ...blob, x, y, vx, vy };
        }));

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (blobs.length > 0) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [blobs.length > 0]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {blobs.map(blob => (
                <View
                    key={blob.id}
                    style={{
                        position: 'absolute',
                        left: blob.x,
                        top: blob.y,
                        width: blob.size,
                        height: blob.size,
                        borderRadius: blob.size / 2, // Círculo perfecto
                        backgroundColor: blob.color,
                        opacity: blob.opacity, // Opacidad dinámica
                    }}
                />
            ))}
        </View>
    );
};