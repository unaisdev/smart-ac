# Materiales — Smart AC

Lista de la compra, presupuesto orientativo (EUR, 2026) y conexionado del prototipo. El comportamiento del sistema está en [`SPECS.md`](SPECS.md).

El diseño usa piezas **baratas y fáciles de encontrar** (AliExpress, Amazon, tiendas de electrónica). Si ya tienes el kit de IR (VS1838B + LEDs 940 nm), no hace falta comprar receptores ni LEDs extra para el primer prototipo.

No hace falta ESP32-S3. No hay que abrir el aire.

---

## 1. Lista de materiales (BOM)

### Obligatorio

| # | Pieza | Cant. | Notas | Precio orientativo |
| --- | --- | --- | --- | --- |
| 1 | ESP32-WROOM-32 DevKit V1 | 1 | 30 pines, USB-UART. Clones sirven. | 4–8 € |
| 2 | VS1838B (38 kHz) | 1 | Receptor para aprender el mando. El kit del usuario vale. | 1–2 € |
| 3 | LED IR 940 nm | 1–2 | Uno por aire si no cubre el mismo emisor. 5 mm típico. | 0,50–1 € ud. |
| 4 | Cable USB (micro-USB o USB-C según la placa) | 1 | Alimentación y flasheo. **Datos**, no solo carga. | 2–4 € |

### Recomendado para emisión con alcance decente

| # | Pieza | Cant. | Notas | Precio orientativo |
| --- | --- | --- | --- | --- |
| 5 | Transistor NPN 2N2222 o BC337 | 1–2 | Un transistor por LED IR. | < 0,50 € |
| 6 | Resistencia 1 kΩ | 1–2 | Base del transistor. | pack ~1 € |
| 7 | Resistencia 100–220 Ω (1/4 W) | 1–2 | Limitadora del LED IR (desde 5 V). | incluido en pack |
| 8 | Fuente 5 V estable | 1 | El USB del PC vale para prototipo. | — |

### Prototipado

| # | Pieza | Cant. | Notas | Precio orientativo |
| --- | --- | --- | --- | --- |
| 9 | Breadboard 400 o 830 puntos | 1 | | 3–5 € |
| 10 | Cables Dupont M-M / M-H | 1 set | | 2–3 € |
| 11 | (Opcional) protoboard perforada | 1 | Cuando el prototipo se “congele”. | 2 € |

### Herramientas

| Pieza | Para qué |
| --- | --- |
| Ordenador con USB | Flashear el ESP32 y ver el serial |
| Multímetro | Comprobar 3V3, 5V y continuidad |
| (Opcional) osciloscopio / analizador lógico | Solo si hay que depurar el IR a fondo |
| Mando original Midea RG10 | Captura; sin él no hay fase 1 |

### Ya lo tienes si montas el kit IR

- VS1838B u otro receptor 38 kHz
- LEDs IR 940 nm
- A veces un emisor ya montado: **sí sirve**, pero documenta el pinout real

**Presupuesto prototipo** si partes de cero: **aprox. 15–25 €**. Con kit IR + ESP32: **aprox. 8–12 €**.

---

## 2. Qué no hace falta al inicio

- ESP32-S3 / C3 / pantalla
- Relés, optoacopladores, ni tocar el bus del aire
- Fuente de 12 V (el LED IR se alimenta a 5 V vía USB)
- Caja impresa en 3D (útil más adelante, no bloquea el MVP)
- Antena MQTT extra: la del DevKit basta en casa

---

## 3. Alimentación

| Rail | Uso |
| --- | --- |
| 3V3 del DevKit | Lógica ESP32. El VS1838B suele aceptar 2,7–5,5 V; preferible **5 V** en VCC del receptor si el datasheet lo permite (mejor alcance de recepción). |
| 5 V USB (`VIN` / `5V` del DevKit) | LED IR + colector del transistor. Más corriente = más alcance. |
| GND común | ESP32, receptor y emisor **comparten masa**. |

No alimentar el LED IR directo desde un GPIO: el pin no da corriente suficiente y se puede dañar.

---

## 4. Pines recomendados (DevKit V1)

Pines de ejemplo. Si tu placa etiqueta distinto, cambia y **documenta** en el firmware.

| Señal | GPIO sugerido | Notas |
| --- | --- | --- |
| IR receiver OUT | GPIO 15 | Evitar GPIO 0 / 2 / 12 en boot. |
| IR LED #1 (Salón) PWM/out | GPIO 4 | Sale hacia la base del transistor (con 1 kΩ). |
| IR LED #2 (Dormitorio) | GPIO 5 | Solo si hay segundo emisor. |
| GND | GND | Común. |
| VS1838B VCC | 5V o 3V3 | Según módulo; muchos kits esperan 5 V. |

```text
ESP32 DevKit V1
────────────────────────────
3V3  5V  GND  GPIO15  GPIO4  GPIO5
 │    │   │      │       │      │
 │    │   │      │       │      └── opcional LED IR #2 (base Q2)
 │    │   │      │       └──────── LED IR #1 (base Q1)
 │    │   │      └──────────────── VS1838B OUT
 │    │   └─────────────────────── GND común
 │    └─────────────────────────── VCC receptor + ánodo LED (vía R y transistor)
 └──────────────────────────────── (no usar para el LED de potencia)
```

---

## 5. Conexionado — receptor (fase 1)

VS1838B visto de frente (domo hacia ti, patas abajo): **OUT | GND | VCC** en muchos ejemplares. **Comprueba el silkscreen de tu módulo**; los kits a veces van al revés.

```text
        5V ─── VS1838B VCC
       GND ─── VS1838B GND
    GPIO15 ─── VS1838B OUT
```

Algunos módulos ya traen resistencia de pull-up. Si OUT flota, pull-up 10 kΩ a 3V3.

El mando original se apunta al domo, a **20–50 cm**, sin sol al receptor.

---

## 6. Conexionado — emisor (fase 3)

### Prueba mínima (corto alcance)

GPIO → resistencia 220 Ω → ánodo LED IR → cátodo → GND.

Solo para verificar que el aire “oye” a pocos centímetros. No es la versión definitiva.

### Versión recomendada (transistor)

Un LED por aire, o uno solo si ambos aparatos ven el mismo punto.

```text
                 5V
                  │
                 [R 150–220 Ω]
                  │
              ánodo LED IR 940 nm
                  │
               cátodo
                  │
              colector Q (2N2222 / BC337)
                  │
GPIO ──[1 kΩ]── base
                  │
               emisor ── GND
```

- Polaridad del LED IR: la pata larga suele ser ánodo; el “tejado” plano del encapsulo 5 mm, cátodo. Si no emite, invierte **una vez** (el IR no se ve a simple vista; la cámara del móvil suele mostrar un resplandor).
- Si el alcance es corto: baja un poco R del LED (no por debajo de ~100 Ω a 5 V sin medir corriente), o usa **dos LEDs en paralelo** cada uno con su R, o acerca el emisor al aparato.
- Dos aires en habitaciones distintas: **dos etapas iguales** (GPIO4 y GPIO5).

---

## 7. Disposición física de los dos aires

| Situación | Montaje |
| --- | --- |
| Los dos aparatos ven el mismo rincón (pasillo, estantería alta) | Un LED IR, `deviceId` distinto en el payload; el firmware elige la misma salida física |
| Salón y dormitorio sin línea de vista común | Dos LEDs, uno orientado a cada split; el firmware mapea `ac-salon` → GPIO4, `ac-dormitorio` → GPIO5 |
| Un ESP32 por casa y un emisor lejos | Válido; el MQTT es el mismo |

La spec exige que el software permita **ambas** topologías.

IR es línea de vista. Puertas cerradas, cristales gruesos y sol directo empeoran la recepción del split.

---

## 8. Software de apoyo (no es “material”, pero hace falta)

| Herramienta | Uso | Instalar en fase |
| --- | --- | --- |
| Driver USB-UART (CP2102 o CH340) | Flashear el DevKit | 1 |
| Arduino IDE o PlatformIO | Compilar firmware | 1 |
| Monitor serie 115200 | Ver capturas IR | 1 |
| Mosquitto (o Docker) | Broker MQTT | 5 |
| Docker Desktop / Engine | Compose local | 6 |

**Fase 0: no instalar nada de esto.** Este documento solo deja constancia de qué hará falta.

---

## 9. Seguridad eléctrica y de datos

- El montaje es de **5 V USB**. No conectes 220 V a la breadboard.
- No abras el aire acondicionado en el MVP.
- No dejes el LED IR a 5 V sin resistencia.
- WiFi y MQTT van en el dispositivo, no en este repo (ver [`.env.example`](../.env.example)).
- El receptor IR no es una cámara: no captura audio ni red, solo pulsos 38 kHz.

---

## 10. Dónde comprar (orientativo)

Cualquier kit “ESP32 DevKit V1” + “IR receiver VS1838” + “5 mm IR LED 940 nm” + “NPN 2N2222” sirve. En Europa, Amazon/AliExpress cubren el BOM en un pedido. En tiendas locales, pide **940 nm** explícitamente: un LED rojo visible no controla el aire.

Cuando alguien reproduzca el montaje con otro receptor (KY-022, TSOP1838, etc.), que lo anote en un issue: frecuencia y pinout importan más que la marca.
