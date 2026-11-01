#!/bin/sh
# Roda UMA vez, como root, no mamaco-dev. Depois disso o usuário dev atualiza a API sem root: sudo /usr/local/bin/sanctuary-deploy
# O sudoers libera só esse script, sem argumentos. O compose fica em /etc/sanctuary (de root), então o dev muda o código da API,
# mas não consegue montar pastas do host nem dar privilégios ao container. Mudar o compose exige rodar esta instalação de novo.
set -eu
SRC=/home/dev/sanctuary-api
install -d -o root -g root -m 755 /etc/sanctuary
sed "s#build: \.#build: $SRC#" "$SRC/compose.yml" > /etc/sanctuary/compose.yml
chown root:root /etc/sanctuary/compose.yml
chmod 644 /etc/sanctuary/compose.yml

cat > /usr/local/bin/sanctuary-deploy <<EOF
#!/bin/sh
# Reconstrói o sanctuary-api. Sempre com -p sanctuary: outro nome de projeto sobe com volume vazio.
set -eu
exec 9>/tmp/sanctuary-deploy.lock
flock 9
docker compose -p sanctuary -f /etc/sanctuary/compose.yml --env-file $SRC/.env up -d --build
EOF
chown root:root /usr/local/bin/sanctuary-deploy
chmod 755 /usr/local/bin/sanctuary-deploy

RULE=$(mktemp)
echo 'dev ALL=(root) NOPASSWD: /usr/local/bin/sanctuary-deploy ""' > "$RULE"
visudo -cf "$RULE"
install -o root -g root -m 440 "$RULE" /etc/sudoers.d/dev-sanctuary
rm -f "$RULE"

/usr/local/bin/sanctuary-deploy
echo 'sanctuary-deploy instalado.'
