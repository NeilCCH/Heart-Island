import type { Pet } from '../../core/types';
import { copy } from '../copy';

// 只使用已核准的靜態素材（原圖去背、未重繪）；不生成、不換角色。引導時只做整體上下起伏。
// 依部署路徑組合（Vercel 根目錄或預覽子路徑皆可）。
export const CAT_SRC = `${import.meta.env.BASE_URL}assets/cat/cutout.webp`;
export const DOG_SRC = `${import.meta.env.BASE_URL}assets/dog/cutout.webp`;
// lids：閉眼時疊在眼睛上的毛色層（萌寵陪伴屋用）
export const PET_IMAGE: Record<Pet, { src: string; lids: string; width: number; height: number }> = {
  cat: { src: CAT_SRC, lids: `${import.meta.env.BASE_URL}assets/cat/lids.webp`, width: 361, height: 436 },
  dog: { src: DOG_SRC, lids: `${import.meta.env.BASE_URL}assets/dog/lids.webp`, width: 373, height: 436 },
};

// lift：0（坐在地上）～1（升到最高），引導時跟著節奏起伏；不給就是靜止。
export function PetFigure({ pet = 'cat', size = 'regular', lift }: { pet?: Pet; size?: 'regular' | 'compact'; lift?: number }) {
  const image = PET_IMAGE[pet];
  const style = lift === undefined ? undefined : { ['--lift' as string]: lift.toFixed(3) };
  return (
    <figure className={`cat cat--${size}${lift === undefined ? '' : ' cat--moving'}`} style={style}>
      <img src={image.src} alt={copy.petAlt[pet]} width={image.width} height={image.height} decoding="async" />
    </figure>
  );
}
