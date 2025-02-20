import unicodedata

def normalize_text(text):
    """
    Normaliza texto en español:
    - Convierte a minúsculas
    - Elimina acentos
    - Elimina caracteres especiales
    
    Args:
        text (str): Texto a normalizar
    
    Returns:
        str: Texto normalizado
    """
    if not isinstance(text, str):
        return text
    
    # Convertir a minúsculas
    text = text.lower()
    
    # Reemplazar "/" por espacio
    text = text.replace('/', ' ')
    
    # Eliminar acentos
    text = ''.join(c for c in unicodedata.normalize('NFD', text)
                  if unicodedata.category(c) != 'Mn')
    
    return text.strip()