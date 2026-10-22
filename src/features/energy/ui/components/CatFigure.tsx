import { copy } from '../copy';

// 只使用已核准的靜態素材；不生成、不換貓、不做假3D或動畫。
export const CAT_SRC = '/assets/cat/original.png';

export function CatFigure({ size = 'regular' }: { size?: 'regular' | 'compact' }) {
  return (
    <figure className={`cat cat--${size}`}>
      <img src={CAT_SRC} alt={copy.catAlt} width={517} height={450} decoding="async" />
    </figure>
  );
}
