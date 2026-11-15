# Verificació de la muestra de Química (T2)

Fuente: `docs/muestra-quimica.json` (20 preguntas) contra `banks/quimica/texto/t2.md`.
Criterios: respuesta correcta, ambigüedad, trampas, coincidencia con la página citada y recálculo de los problemas.

## Resultado por pregunta

| id | Resultado | Motivo |
|---|---|---|
| qui-t2-0078 | Fallo (crítico) | La trampa de "11,2 L" dice "divideix els mols entre 22,4", pero 2,0 / 22,4 = 0,089 (es la opción d); 11,2 sale de 22,4 / 2,0 |
| qui-t2-0029 | OK | Coincide con p. 7 (aforat: una marca, volum fix) |
| qui-t2-0095 | OK | 300 g = 0,300 kg; trampas ÷10 000 y ÷100 bien calculadas; p. 16 lo dice ("divideix per 1000") |
| qui-t2-0010 | OK | Norma 12, p. 4 |
| qui-t2-0014 | OK | Definiciones literales de p. 5 |
| qui-t2-0144 | OK | Decantación por densidad, p. 23 y p. 10 |
| qui-t2-0019 | OK | Coincide con p. 6 (dosis altas frente a dosis pequeñas) |
| qui-t2-0088 | OK | Tabla evaporació/ebullició de p. 15 |
| qui-t2-0150 | Fallo (menor) | Respuesta correcta (Fals), pero "surt primer el de baix" solo está en p. 10; la p. 23 citada no lo dice |
| qui-t2-0012 | OK | Norma 15, p. 4 |
| qui-t2-0125 | OK | p. 22: solut en menys quantitat |
| qui-t2-0042 | OK | p. 9: "el bec Bunsen l'escalfa des de sota" |
| qui-t2-0009 | OK | Norma 6, p. 4 |
| qui-t2-0060 | OK | e⁻ = 13 − 3 = 10; está en la tabla de p. 12 |
| qui-t2-0114 | OK | V = 0,500 · 0,082 · 400 / 2,00 = 8,20 L |
| qui-t2-0113 | OK | n = 20,0 / (0,082 · 300) = 0,813 mol |
| qui-t2-0055 | OK | Z = 40 − 20 = 20, e⁻ = 20 |
| qui-t2-0080 | OK | 67,2 / 22,4 = 3,00 mol |
| qui-t2-0143 | OK | (5,0 + 6,0) g / 0,400 L = 27,5 g/L; usa m = c · V de p. 19 |
| qui-t2-0142 | OK | 35 · 0,060 = 2,10 g |

## Recuento

- OK: 18
- Fallos: 2 (1 crítico, 1 menor)
- Problemas recalculados: 7 de 7 correctos, con todos los datos y unidad clara.

## Fallos y corrección propuesta

1. **qui-t2-0078 (crítico, trampa con cálculo falso).** Cambiar la trampa de la opción b ("11,2 L") por: "Trampa: divideix 22,4 entre els mols en lloc de multiplicar". La opción d ya cubre el error de calcular 2,0 / 22,4.
2. **qui-t2-0150 (menor, página citada).** Cambiar `fuente_pagina` a 10 (y `fuente_cara` a 10), donde el booklet dice "s'obre la clau i surt primer el de baix". Alternativa: mantener 23 y citar también la 10.

## Observaciones sin fallo

- El prefijo de las trampas es inconsistente: "Trampa:", "trampa:" o ninguno (0029, 0125, 0042); 0125 además acaba en punto. Conviene unificarlo.
- 0014, `ayuda_larga`: "els tres primers poden explotar, cremar o avivar el foc"; el booklet (p. 5) dice "explotar, cremar o corroir". No es falso, pero no coincide literalmente.
- 0144, explicación: "surt primer el líquid de baix" también procede de p. 10, no de p. 23.
- 0009: la explicación añade "encara que sigui de lluny", que el booklet no menciona (prohíbe ensumar sin matices). Coherente con la norma.
