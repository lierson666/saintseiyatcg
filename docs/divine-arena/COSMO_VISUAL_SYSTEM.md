# Cosmo Visual System

| Recurso | Forma | Cor | Estados |
| --- | --- | --- | --- |
| Cosmo Base | Esfera | Dourado `#ffd36e` | pronta (brilha), gasta (vazia), gastando (pulsa e apaga), prévia (pisca) |
| Latent Cosmo | Esfera, sempre 3 slots (limite D198) | Violeta `#b58cff` | cheia, vazia, ganhando (carga de partículas + "+N Latent") |

- O banco mostra `prontas/total` e `latent/3`.
- **Prévia de custo**: ao passar o mouse numa carta jogável, as esferas que o pagamento consumiria piscam.
- **Pagamento**: `cosmo_spent` apaga as esferas da direita para a esquerda.
- **Conversão** (fim de turno, D5): `latent_gained` faz as partículas convergirem no banco Latent.
- O custo da carta usa a mesma esfera (dourada = Base, violeta = Latent): a ligação carta ↔ recurso é visual, não textual.
