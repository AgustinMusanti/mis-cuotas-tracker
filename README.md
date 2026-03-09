# Mis Cuotas 💳

Una pequeña herramienta web para **organizar compras en cuotas con múltiples tarjetas de crédito** y poder ver de forma clara cuánto hay que pagar cada mes.

## El problema

Cuando usás varias tarjetas de crédito, cada una tiene **un día de cierre distinto**.  
Si además hacés compras en cuotas, mantener una previsibilidad de los pagos mensuales se vuelve complicado.

Entre compras nuevas, cuotas activas y distintos cierres de tarjeta, responder una pregunta simple no siempre es tan fácil:

> ¿Cuánto voy a tener que pagar realmente este mes?

Esta herramienta nació para resolver ese problema en mi propio uso personal.

---

## Qué hace la herramienta

La aplicación permite registrar compras realizadas con tarjeta y automáticamente calcula cómo impactan en los meses siguientes.

Con esto se puede ver fácilmente:

- el **total a pagar en el mes**
- cuánto corresponde a **cada tarjeta**
- el **detalle de cada cuota**
- la distribución de gastos por **categoría**

También permite:

- **agregar o quitar tarjetas**
- definir el **día de cierre de cada tarjeta**
- registrar compras en **cuotas o en un pago**

---

## Cómo funciona

La aplicación está construida como una **mini web app en React**.

Los datos se guardan en el **localStorage del navegador**, por lo que:

- no requiere crear una cuenta
- no guarda información en servidores
- todo queda almacenado localmente en el dispositivo del usuario

---

## Demo

La aplicación está publicada y puede probarse acá:

👉 https://mis-cuotas-tracker.vercel.app/

El deploy se realiza utilizando **Vercel**, conectado directamente con este repositorio.

---

## Objetivo del proyecto

Este proyecto nació principalmente para **resolver un problema personal de organización financiera**.

Con el tiempo la idea es seguir mejorándolo, agregando nuevas funcionalidades y refinando la herramienta para que sea cada vez más útil.

---

## Feedback

Si alguien prueba la herramienta y tiene ideas, sugerencias o mejoras posibles, siempre son bienvenidas.
