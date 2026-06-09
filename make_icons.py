from PIL import Image, ImageDraw
import os

def draw_tab(draw, x, y, w, h, radius, fill, outline=None, outline_width=2):
    """Draw a browser-tab shape: rectangle with rounded top corners only."""
    r = radius
    # Top-left arc
    draw.ellipse([x, y, x + 2*r, y + 2*r], fill=fill)
    # Top-right arc
    draw.ellipse([x + w - 2*r, y, x + w, y + 2*r], fill=fill)
    # Main body rectangles
    draw.rectangle([x + r, y, x + w - r, y + h], fill=fill)
    draw.rectangle([x, y + r, x + w, y + h], fill=fill)
    if outline:
        lw = outline_width
        # Top-left arc outline
        draw.arc([x, y, x + 2*r, y + 2*r], 180, 270, fill=outline, width=lw)
        # Top-right arc outline
        draw.arc([x + w - 2*r, y, x + w, y + 2*r], 270, 360, fill=outline, width=lw)
        # Top line
        draw.line([x + r, y, x + w - r, y], fill=outline, width=lw)
        # Left line
        draw.line([x, y + r, x, y + h], fill=outline, width=lw)
        # Right line
        draw.line([x + w, y + r, x + w, y + h], fill=outline, width=lw)

def draw_x(draw, cx, cy, radius, color, width):
    o = int(radius * 0.65)
    draw.line([cx - o, cy - o, cx + o, cy + o], fill=color, width=width)
    draw.line([cx + o, cy - o, cx - o, cy + o], fill=color, width=width)

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size / 128  # scale factor

    bg_r = int(10 * s)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=bg_r, fill="#1a73e8")

    tab_w = int(80 * s)
    tab_h = int(52 * s)
    tab_r = max(3, int(6 * s))
    outline_w = max(1, int(2.5 * s))

    # Back tab (duplicate) — grey, offset top-left
    bx = int(10 * s)
    by = int(14 * s)
    draw_tab(draw, bx, by, tab_w, tab_h, tab_r, fill="#a8c7fa", outline="#5a9df5", outline_width=outline_w)

    # Middle tab (duplicate) — slightly offset
    mx = int(20 * s)
    my = int(22 * s)
    draw_tab(draw, mx, my, tab_w, tab_h, tab_r, fill="#a8c7fa", outline="#5a9df5", outline_width=outline_w)

    # Front tab (keeper) — white, foremost
    fx = int(30 * s)
    fy = int(34 * s)
    draw_tab(draw, fx, fy, tab_w, tab_h, tab_r, fill="white", outline="#e8f0fe", outline_width=outline_w)

    # Red X badge — bottom-right corner
    badge_r = int(20 * s)
    bx2 = int(size - badge_r - int(6 * s))
    by2 = int(size - badge_r - int(6 * s))
    draw.ellipse([bx2 - badge_r, by2 - badge_r, bx2 + badge_r, by2 + badge_r], fill="#ea4335")
    x_w = max(2, int(3.5 * s))
    draw_x(draw, bx2, by2, badge_r, "white", x_w)

    return img

os.makedirs("icons", exist_ok=True)
for size in [16, 32, 48, 128]:
    img = make_icon(size)
    img.save(f"icons/icon{size}.png")
    print(f"icons/icon{size}.png  {size}x{size}")
