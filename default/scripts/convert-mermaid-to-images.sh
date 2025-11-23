#!/bin/bash

# Скрипт для конвертации Mermaid диаграмм из ARCHITECTURE_BOOK.md в изображения
# Требует: npm install -g @mermaid-js/mermaid-cli

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIAGRAMS_DIR="$PROJECT_ROOT/presentation-diagrams"
SOURCE_FILE="$PROJECT_ROOT/arch_slides.md"
TEMP_DIR=$(mktemp -d)

# Создаем директорию для диаграмм
mkdir -p "$DIAGRAMS_DIR"

echo "Извлечение Mermaid диаграмм из $SOURCE_FILE..."

# Извлекаем все Mermaid блоки и конвертируем их
counter=1
in_mermaid=false
mermaid_content=""
diagram_name=""

while IFS= read -r line; do
    if [[ "$line" =~ ^\`\`\`mermaid ]]; then
        in_mermaid=true
        mermaid_content=""
        diagram_name="diagram_${counter}"
        ((counter++))
    elif [[ "$in_mermaid" == true && "$line" =~ ^\`\`\` ]]; then
        in_mermaid=false
        # Сохраняем диаграмму во временный файл
        temp_mmd="$TEMP_DIR/${diagram_name}.mmd"
        echo "$mermaid_content" > "$temp_mmd"
        
        # Конвертируем в PNG
        echo "Конвертация $diagram_name..."
        mmdc -i "$temp_mmd" -o "$DIAGRAMS_DIR/${diagram_name}.png" -w 1920 -H 1080 -b transparent 2>/dev/null || {
            echo "Ошибка: mermaid-cli не установлен. Установите: npm install -g @mermaid-js/mermaid-cli"
            echo "Или используйте онлайн конвертер: https://mermaid.live/"
            exit 1
        }
        
        echo "✓ Создано: $DIAGRAMS_DIR/${diagram_name}.png"
        mermaid_content=""
    elif [[ "$in_mermaid" == true ]]; then
        mermaid_content="${mermaid_content}${line}"$'\n'
    fi
done < "$SOURCE_FILE"

# Очистка
rm -rf "$TEMP_DIR"

echo ""
echo "Готово! Диаграммы сохранены в: $DIAGRAMS_DIR"
echo "Теперь обновите ARCHITECTURE_BOOK.md, заменив блоки \`\`\`mermaid на:"
echo "![Diagram]($DIAGRAMS_DIR/diagram_X.png)"





