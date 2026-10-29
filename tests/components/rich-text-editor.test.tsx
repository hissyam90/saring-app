import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextEditor } from "@/components/komunitas/rich-text-editor";
import type { RichDoc } from "@/lib/content/rich-text";

const initialDoc: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Judul bagian" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Teks tebal", marks: [{ type: "bold" }] },
        { type: "text", text: " dan " },
        {
          type: "text",
          text: "tautan",
          marks: [{ type: "link", attrs: { href: "https://ojk.go.id/" } }],
        },
      ],
    },
  ],
};

function renderEditor(initial: RichDoc | null = initialDoc) {
  return render(<RichTextEditor initialDoc={initial} onChange={() => {}} />);
}

describe("RichTextEditor", () => {
  it("menampilkan toolbar dengan label aksesibel yang lengkap", () => {
    renderEditor();

    for (const label of [
      "Paragraf biasa",
      "Judul tingkat 2",
      "Judul tingkat 3",
      "Tebal",
      "Miring",
      "Garis bawah",
      "Coret",
      "Kode sebaris",
      "Daftar butir",
      "Daftar bernomor",
      "Kutipan",
      "Garis pemisah",
      "Sisipkan atau ubah tautan",
      "Urungkan",
      "Ulangi",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("merender isi awal dengan format yang tersimpan", () => {
    const { container } = renderEditor();

    expect(container.querySelector("h2")).toHaveTextContent("Judul bagian");
    expect(container.querySelector("strong")).toHaveTextContent("Teks tebal");
    expect(container.querySelector("a")).toHaveAttribute("href", "https://ojk.go.id/");
  });

  it("menandai format aktif sesuai posisi kursor", async () => {
    renderEditor();

    // Kursor awal berada di judul H2.
    const h2 = screen.getByRole("button", { name: "Judul tingkat 2" });
    expect(h2).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Paragraf biasa" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Paragraf biasa" }));

    expect(screen.getByRole("button", { name: "Paragraf biasa" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("menjalankan perintah format saat tombol diklik", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();

    await user.click(screen.getByRole("button", { name: "Tebal" }));
    expect(screen.getByRole("button", { name: "Tebal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Miring" }));
    await user.click(screen.getByRole("button", { name: "Daftar butir" }));

    // Daftar butir harus benar-benar terbentuk di dokumen editor.
    expect(container.querySelector(".saring-editor ul")).not.toBeNull();
  });

  it("menampilkan penghitung karakter dan hint", () => {
    renderEditor();

    expect(screen.getByText(/karakter$/)).toBeInTheDocument();
    expect(screen.getByText(/Minimal 300 karakter/i)).toBeInTheDocument();
  });

  it("membuka dialog tautan dan menolak URL berbahaya tanpa menyimpan", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }));

    const input = screen.getByLabelText("Alamat tautan");
    await user.clear(input);
    await user.type(input, "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Sisipkan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/https:\/\//i);
  });

  it("menyisipkan tautan aman ke dalam dokumen", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();

    await user.click(screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }));
    const input = screen.getByLabelText("Alamat tautan");
    await user.clear(input);
    await user.type(input, "contoh.go.id/panduan");
    await user.click(screen.getByRole("button", { name: "Sisipkan" }));

    const links = [...container.querySelectorAll(".saring-editor a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(links).toContain("https://contoh.go.id/panduan");
  });
});

describe("RichTextEditor: area menulis", () => {
  it("memakai shell ber-min-height agar area kosong tetap luas", () => {
    const { container } = renderEditor(null);

    const shell = container.querySelector(".saring-editor-shell");
    expect(shell).not.toBeNull();

    const editor = container.querySelector("#artikel-editor");
    expect(editor).not.toBeNull();
    expect(editor?.className).toContain("saring-editor");
  });

  it("menampilkan satu tombol media tanpa menghapus tombol format lain", () => {
    renderEditor();

    expect(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    ).toBeInTheDocument();
    // Fitur lama tetap ada.
    expect(screen.getByRole("button", { name: "Tebal" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }),
    ).toBeInTheDocument();
  });
});


describe("RichTextEditor: media universal", () => {
  it("menampilkan satu tombol media dan mempertahankan tombol format lain", () => {
    renderEditor();

    expect(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tebal" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }),
    ).toBeInTheDocument();
  });

  it("menyisipkan gambar dari hosting HTTPS mana pun", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.type(
      screen.getByLabelText("URL atau kode media"),
      "https://i.postimg.cc/abcd1234/foto.jpg",
    );
    await user.type(screen.getByLabelText("Teks alternatif media"), "Contoh");
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    const img = container.querySelector("#artikel-editor img");
    expect(img).toHaveAttribute("src", "https://i.postimg.cc/abcd1234/foto.jpg");
    expect(img).toHaveAttribute("alt", "Contoh");
    // Wajib: host gambar menolak hotlink bila Referer dikirim (HTTP 403).
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("menyisipkan gambar dari ImgBB dan Imgbox", async () => {
    for (const url of [
      "https://i.ibb.co/abcd1234/foto.png",
      "https://images2.imgbox.com/aa/bb/foto.jpeg",
    ]) {
      const user = userEvent.setup();
      const { container, unmount } = renderEditor(null);

      await user.click(
        screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
      );
      await user.type(screen.getByLabelText("URL atau kode media"), url);
      await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

      expect(container.querySelector("#artikel-editor img")).toHaveAttribute(
        "src",
        url,
      );
      unmount();
    }
  });

  it("menerima BBCode [img]", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.click(screen.getByLabelText("URL atau kode media"));
    await user.paste("[img]https://i.ibb.co/abcd1234/bbcode.png[/img]");
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    expect(container.querySelector("#artikel-editor img")).toHaveAttribute(
      "src",
      "https://i.ibb.co/abcd1234/bbcode.png",
    );
    // Markup BBCode sendiri tidak pernah tersimpan sebagai teks.
    expect(container.innerHTML).not.toContain("[img]");
  });

  it("menerima HTML <img> tanpa membawa atribut event", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.click(screen.getByLabelText("URL atau kode media"));
    await user.paste(
      '<img src="https://i.imgur.com/L0pP68gl.jpg" onerror="alert(1)">',
    );
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    expect(container.querySelector("#artikel-editor img")).toHaveAttribute(
      "src",
      "https://i.imgur.com/L0pP68gl.jpg",
    );
    // Atribut event dari input pengguna tidak pernah masuk ke dokumen.
    expect(container.innerHTML).not.toContain("onerror");
  });


  it("menolak URL tidak aman tanpa menyisipkan apa pun", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.type(
      screen.getByLabelText("URL atau kode media"),
      "javascript:alert(1)",
    );

    // Tombol sisipkan nonaktif karena tidak ada media valid.
    expect(screen.getByRole("button", { name: /^Sisipkan$/ })).toBeDisabled();
    expect(container.querySelector("#artikel-editor img")).toBeNull();
  });

  it("menonaktifkan sisip untuk halaman galeri yang belum didukung embed", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.type(
      screen.getByLabelText("URL atau kode media"),
      "https://postimg.cc/abcd1234",
    );

    expect(screen.getByRole("button", { name: /^Sisipkan$/ })).toBeDisabled();
    expect(container.querySelector("#artikel-editor img")).toBeNull();
  });

  it("menyisipkan embed Imgur dari URL album", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.type(
      screen.getByLabelText("URL atau kode media"),
      "https://imgur.com/a/l4mKcOj",
    );
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    const iframe = container.querySelector("#artikel-editor iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    expect(container.querySelector(".saring-embed")).not.toBeNull();
  });

  it("mengurai kode embed resmi tanpa menyimpan script", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.click(screen.getByLabelText("URL atau kode media"));
    await user.paste(
      '<blockquote class="imgur-embed-pub" data-id="a/ALc9tWx"></blockquote><script async src="//s.imgur.com/min/embed.js"></script>',
    );
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    const iframe = container.querySelector("#artikel-editor iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://imgur.com/a/ALc9tWx/embed?pub=true",
    );
    expect(container.querySelector('script[src*="imgur"]')).toBeNull();
    expect(container.innerHTML).not.toContain("embed.js");
  });

  it("menolak hostname palsu", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(
      screen.getByRole("button", { name: "Sisipkan gambar atau media" }),
    );
    await user.type(
      screen.getByLabelText("URL atau kode media"),
      "https://imgur.com.evil.test/a/l4mKcOj",
    );

    expect(screen.getByRole("button", { name: /^Sisipkan$/ })).toBeDisabled();
    expect(container.querySelector("#artikel-editor iframe")).toBeNull();
  });

  it("memuat media yang sudah tersimpan di dokumen", () => {
    const { container } = renderEditor({
      type: "doc",
      content: [
        { type: "mediaEmbed", attrs: { provider: "imgur", id: "l4mKcOj" } },
        {
          type: "image",
          attrs: {
            src: "https://i.ibb.co/abcd1234/tersimpan.png",
            alt: "Tersimpan",
          },
        },
      ],
    });

    expect(container.querySelector("#artikel-editor iframe")).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    const img = container.querySelector("#artikel-editor img");
    expect(img).toHaveAttribute("src", "https://i.ibb.co/abcd1234/tersimpan.png");
    expect(img).toHaveAttribute("alt", "Tersimpan");
  });
});

