import { copy } from '../copy';

// 只使用已核准的靜態素材（original.png 去背、未重繪）；不生成、不換貓、不做假3D或動畫。
export const CAT_SRC = '/assets/cat/cutout.png';

export function CatFigure({ size = 'regular' }: { size?: 'regular' | 'compact' }) {
  return (
    <figure className={`cat cat--${size}`}>
      <img src={CAT_SRC} alt={copy.catAlt} width={361} height={436} decoding="async" />
    </figure>
  );
}
