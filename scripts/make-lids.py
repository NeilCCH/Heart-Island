import sys, cv2, numpy as np
from PIL import Image
# 閉眼毛色層：低頻顏色用修補（inpaint）後模糊，高頻毛流借用眼睛上方的毛的細節。
def make(src, scale, eyes, out, preview, pad=1.32, feather=1.7, detail_sigma=1.6, low_sigma=5):
    im=np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    H,W=im.shape[:2]
    rgb=im[:,:,:3]
    mask=np.zeros((H,W),np.uint8)
    for e in eyes:
        cx,cy,rx,ry=[v*scale for v in e[:4]]
        cv2.ellipse(mask,(int(cx),int(cy)),(int(rx*pad),int(ry*pad)),0,0,360,255,-1)
    fill=cv2.inpaint(rgb.astype(np.uint8),mask,int(8*scale),cv2.INPAINT_TELEA).astype(np.float32)
    low=cv2.GaussianBlur(fill,(0,0),low_sigma*scale)
    detail_src=cv2.GaussianBlur(rgb,(0,0),detail_sigma*scale)
    detail=rgb-detail_src  # 原圖的高頻細節
    result=rgb.copy()
    yy,xx=np.mgrid[0:H,0:W]
    alpha=np.zeros((H,W),np.float32)
    for e in eyes:
        cx,cy,rx,ry=[v*scale for v in e[:4]]; dx,dy=[v*scale for v in e[4]]
        # 從眼睛上方 (dx,dy) 借毛流細節
        M=np.float32([[1,0,dx],[0,1,dy]])
        shifted=cv2.warpAffine(detail,M,(W,H),borderMode=cv2.BORDER_REFLECT)
        d=np.sqrt(((xx-cx)/(rx*pad))**2+((yy-cy)/(ry*pad))**2)
        inside=d<=feather
        tex=np.clip(low+shifted*1.1,0,255)
        w=np.clip((feather-d)/(feather-1.0),0,1)[:,:,None]  # 1 inside the eye cover
        result=np.where(inside[:,:,None], result*(1-w)+tex*w, result)
        alpha=np.maximum(alpha,np.clip((feather-d)/0.15,0,1))
    out_img=np.zeros((H,W,4),np.uint8)
    out_img[:,:,:3]=np.clip(result,0,255).astype(np.uint8)
    out_img[:,:,3]=(np.clip(alpha,0,1)*im[:,:,3]).astype(np.uint8)
    out_img[out_img[:,:,3]==0]=0  # 透明處清空，檔案才小
    Image.fromarray(out_img).save(out)
    base=Image.fromarray(im.astype(np.uint8)); top=Image.fromarray(out_img)
    bg=Image.new('RGBA',base.size,(243,233,222,255)); bg.alpha_composite(base); bg.alpha_composite(top); bg.save(preview)
# 用法：python3 scripts/make-lids.py <輸出暫存資料夾>
# 產生 cat_lids.png / dog_lids.png 與預覽圖；確認後再轉存到 public/assets/{cat,dog}/。
# 眼睛數值（cx, cy, rx, ry, 借毛流的位移）需與 src/features/companion/PetRig.tsx 的 eyes 一致。
# 需要 opencv-python-headless、numpy、Pillow。
S=sys.argv[1]
make('public/assets/cat/cutout.png',1,[(138,171,29,24,(0,62)),(236,146,27,25,(18,62))],f'{S}/cat_lids.png',f'{S}/cat_lids_prev.png')
make('public/assets/dog/cutout.webp',2,[(170,108,15,13,(0,40)),(253,96,14,13,(0,40))],f'{S}/dog_lids.png',f'{S}/dog_lids_prev.png')
