<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 2.2cm 2cm; }
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #1c2620;
            font-size: 12px;
            line-height: 1.5;
        }
        h1 {
            font-size: 24px;
            margin: 0 0 6px;
            color: #22331f;
        }
        .tags { margin: 0 0 4px; }
        .tag {
            display: inline-block;
            background: #eaf1ec;
            color: #2f6b4f;
            border-radius: 10px;
            padding: 2px 8px;
            font-size: 10px;
            margin-right: 4px;
        }
        .source { font-size: 10px; color: #6e7a72; margin: 0 0 14px; }
        .source a { color: #2f6b4f; text-decoration: none; }
        h2 {
            font-size: 14px;
            color: #2f6b4f;
            border-bottom: 1px solid #e1dfd5;
            padding-bottom: 3px;
            margin: 18px 0 8px;
        }
        ul, ol { margin: 0; padding-left: 20px; }
        li { margin-bottom: 4px; }
        ol li { padding-left: 4px; }
        .notes {
            margin-top: 18px;
            background: #f7f6f1;
            border-left: 3px solid #c9791f;
            padding: 8px 12px;
            font-size: 11px;
        }
        .notes-label {
            font-weight: bold;
            color: #c9791f;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }
        .empty { color: #6e7a72; font-style: italic; }
    </style>
</head>
<body>
    <h1>{{ $recipe->title }}</h1>

    @if (!empty($recipe->tags))
        <div class="tags">
            @foreach ($recipe->tags as $tag)
                <span class="tag">{{ $tag }}</span>
            @endforeach
        </div>
    @endif

    @if ($recipe->source_url)
        <p class="source">Fonte: <a href="{{ $recipe->source_url }}">{{ $recipe->source_url }}</a></p>
    @endif

    <h2>Ingredientes</h2>
    @if (!empty($recipe->ingredients))
        <ul>
            @foreach ($recipe->ingredients as $ingredient)
                <li>{{ $ingredient }}</li>
            @endforeach
        </ul>
    @else
        <p class="empty">Nenhum ingrediente.</p>
    @endif

    <h2>Modo de Preparo</h2>
    @if (!empty($recipe->instructions))
        <ol>
            @foreach ($recipe->instructions as $step)
                <li>{{ $step }}</li>
            @endforeach
        </ol>
    @else
        <p class="empty">Nenhuma instrução.</p>
    @endif

    @if ($recipe->notes)
        <div class="notes">
            <div class="notes-label">Observação</div>
            {{ $recipe->notes }}
        </div>
    @endif
</body>
</html>
