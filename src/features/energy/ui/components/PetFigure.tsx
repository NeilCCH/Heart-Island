import type { Pet } from '../../core/types';
import { copy } from '../copy';

// 只使用已核准的靜態素材（原圖去背、未重繪）；不生成、不換角色、不做假3D或動畫。
// 依部署路徑組合（Vercel 根目錄或預覽子路徑皆可）。
export const CAT_SRC = `${import.meta.env.BASE_URL}assets/cat/cutout.png`;
export const DOG_SRC = `${import.meta.env.BASE_URL}assets/dog/cutout.webp`;
// lids：閉眼時疊在眼睛上的毛色層（萌寵陪伴屋用）
export const PET_IMAGE: Record<Pet, { src: string; lids: string; width: number; height: number }> = {
  cat: { src: CAT_SRC, lids: `${import.meta.env.BASE_URL}assets/cat/lids.webp`, width: 361, height: 436 },
  dog: { src: DOG_SRC, lids: `${import.meta.env.BASE_URL}assets/dog/lids.webp`, width: 373, height: 436 },
};

export function PetFigure({ pet = 'cat', size = 'regular' }: { pet?: Pet; size?: 'regular' | 'compact' }) {
  const image = PET_IMAGE[pet];
  return (
    <figure className={`cat cat--${size}`}>
      <img src={image.src} alt={copy.petAlt[pet]} width={image.width} height={image.height} decoding="async" />
    </figure>
  );
}
