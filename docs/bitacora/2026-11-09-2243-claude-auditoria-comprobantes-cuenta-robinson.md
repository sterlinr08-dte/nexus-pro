# Auditoría · los pagos marcados «a cuenta de Robinson» no son confiables (comprobantes)

## Pedido del dueño
Avisó que el pago de Geovanny Guerrero (05-oct, RD$ 6,500), que el sistema tiene «a cuenta de Robinson», en realidad entró a su cuenta. Pidió auditar y decir qué clientes depositaron en la cuenta de Robinson en este ciclo (20-oct → 20-nov).

## Cómo se marca la cuenta
- Al aplicar un pago por Transferencia o Depósito, quien lo aplica elige la «cuenta destino» como una **persona** (Esterlin o Robinson), no como una cuenta bancaria real (`seguros_registrar_cobro_con_entrega`, `p_cuenta_destino_id` = agente).
- Si quien aplica es el mismo dueño de la cuenta elegida, la entrega queda **confirmada sola** (`v_auto_conf`). Es decir: cuando Robinson marca «mi cuenta», nadie más lo revisa.
- En el sistema solo están registradas las cuentas bancarias de Esterlin (`mis_cuentas_bancarias`); la de Robinson no.

## Comprobantes revisados
De los 104 pagos marcados «a cuenta de Robinson» (RD$ 492,000), solo 4 tienen comprobante adjunto. Los abrí los 4:

| Pago | Monto | Lo que dice el comprobante | Resultado |
|---|---:|---|---|
| Kelvin Famiel Abreu (transferencia del 16-jun) | 5,000 | Destino «SR ESTERLIN R ESPINAL *1654» | Entró a la cuenta de Esterlin |
| Orlando Reyes Gómez (depósito del 30-jun) | 6,500 | Banreservas, cuenta …0600511654, titular Esterlin Rafael Espinal Morrobel | Entró a la cuenta de Esterlin |
| Noelfry Pinales Ortiz (transferencia del 01-ago) | 3,500 | Destino «seguro humano *1124» | Otra cuenta; falta saber de quién es |
| Eligio Antonio Pérez Brito (transferencia del 29-oct) | 4,500 | Destino «Esterlin Seguro *1654» | Entró a la cuenta de Esterlin |

La cuenta Banreservas de Esterlin registrada en el sistema termina en 1654. **3 de 4 comprobantes contradicen el registro.** Sumado a lo que dijo el dueño de Geovanny, hay 4 registros malos comprobados (RD$ 22,500).

## Este ciclo (20-oct → 09-nov)
Solo 2 pagos están marcados «a cuenta de Robinson»:
- Eligio Antonio Pérez Brito, 29-oct, RD$ 4,500: el comprobante dice que entró a la cuenta de Esterlin.
- Lino de los Santos Muñoz, 02-nov, RD$ 4,500, Banreservas, referencia 261102003050060391: sin comprobante; no se puede verificar desde el sistema.

## Conclusión
- La cifra «RD$ 492,000 entraron a la cuenta de Robinson» **no es confiable**. La muestra con comprobante es pequeña (4 de 104), pero 3 de 4 están mal, y todas en el mismo sentido: dinero que está en la cuenta de Esterlin aparece como si lo tuviera Robinson.
- Esto corrige las entradas «auditoria-cuenta-robinson» y la lista enviada al dueño: describen lo registrado, no lo real.
- De los 104 registros, 52 los creó «admin» en carga, 48 Robinson, 3 «Administrador» y 1 Loribel.

## Pendiente (nada cambiado todavía)
1. Saber de quién es la cuenta terminada en 1124.
2. Cotejar contra el estado de cuenta de Esterlin (o el de Robinson) los 100 pagos sin comprobante. Sin eso no hay cifra exacta.
3. Corregir los registros malos con el OK del dueño, sin tocar ciclos cerrados.
4. Prevención: que marcar «cuenta de Robinson» exija comprobante y validación del administrador (hoy se confirma sola), y elegir una cuenta bancaria real en vez de una persona.
