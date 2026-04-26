from PIL import Image, ImageDraw, ImageFont, ImageFilter
from docx import Document
from docx.shared import Inches
import random
import os

def carregar_fonte(tamanho):
    fontes = [
        r"C:\Users\Luizm\Desktop\StevieScript.ttf",   # <-- coloque aqui
        r"C:\Users\Luizm\Desktop\assinatura.ttf",
        r"C:\Windows\Fonts\segoesc.ttf",              # Segoe Script
        r"C:\Windows\Fonts\ariali.ttf"
    ]

    for caminho in fontes:
        if os.path.exists(caminho):
            try:
                return ImageFont.truetype(caminho, tamanho)
            except:
                continue

    return ImageFont.load_default()


def gerar_assinatura(texto, output_img="assinatura.png"):
    largura, altura = 3000, 400
    img = Image.new("RGBA", (largura, altura), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    font = carregar_fonte(140)

    y_base = altura // 2 + random.randint(-5, 5)

    # cinza escuro realista
    cor = random.randint(30, 60)
    draw.text((80, y_base), texto, font=font, fill=(70, 70, 70, 255))

    # inclinação (assinatura)
    img = img.transform(
        img.size,
        Image.AFFINE,
        (1, -0.25, 0, 0, 1, 0),
        resample=Image.BICUBIC
    )

    img = img.rotate(random.uniform(-2, 2), expand=1)

    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    bbox = img.getbbox()
    img = img.crop(bbox)

    img.save(output_img)
    return output_img


def criar_doc_assinatura(nome, caminho_img, output_doc="documento_assinado.docx"):
    doc = Document()

    doc.add_heading("Documento de Teste", 1)
    doc.add_paragraph("Declaro que as informações acima são verdadeiras.\n")

    doc.add_paragraph("\n")

    doc.add_paragraph("________________________________________")

    doc.add_picture(caminho_img, width=Inches(2.5))

    doc.add_paragraph(nome)

    doc.save(output_doc)
    print("Documento criado:", output_doc)


if __name__ == "__main__":
    nome = "Luiz Gustavo de Menezes Braga"

    img = gerar_assinatura(nome)
    criar_doc_assinatura(nome, img)
