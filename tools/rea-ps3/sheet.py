import sys
from pathlib import Path
from PIL import Image, ImageDraw
out=Path(sys.argv[1]); files=[Path(p) for a in sys.argv[2:] for p in sorted(Path(a).rglob('*.png'))]
cell=200; cols=6; rows=(len(files)+cols-1)//cols
sheet=Image.new('RGB',(cols*cell,rows*(cell+14)),(40,40,48)); d=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im=Image.open(f).convert('RGBA'); im.thumbnail((cell-6,cell-6))
    x,y=(i%cols)*cell,(i//cols)*(cell+14)
    bg=Image.new('RGBA',im.size,(70,70,80,255)); bg.alpha_composite(im)
    sheet.paste(bg.convert('RGB'),(x+3,y+3)); d.text((x+3,y+cell),f'{f.parent.name}/{f.stem}'[:30],fill=(230,230,230))
sheet.save(out); print(out, len(files))
