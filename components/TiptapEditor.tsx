import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { marked } from 'marked';
import {
    Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3,
    Quote, Code, Link as LinkIcon, Image as ImageIcon, Undo, Redo, Minus
} from 'lucide-react';

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true,
});

// Convert markdown to HTML - always process through marked
const markdownToHtml = (content: string): string => {
    if (!content) return '';

    // Check for markdown patterns even if wrapped in HTML
    const hasMarkdown = /^#{1,6}\s|^\s*[-*+]\s|\*\*|__|^\s*>/m.test(content);

    if (hasMarkdown) {
        console.log('[TiptapEditor] Converting markdown to HTML');
        // Strip any wrapping HTML tags and convert
        const stripped = content.replace(/<[^>]*>/g, '');
        const result = marked.parse(stripped) as string;
        console.log('[TiptapEditor] Converted:', result.substring(0, 200));
        return result;
    }

    console.log('[TiptapEditor] Content appears to be HTML already');
    return content;
};

interface TiptapEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
}

const MenuButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded transition-colors ${
            isActive
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

const MenuDivider = () => <div className="w-px h-6 bg-slate-700 mx-1" />;

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
    content,
    onChange,
    placeholder = 'Start writing...',
    editable = true
}) => {
    // Convert markdown to HTML
    const htmlContent = useMemo(() => markdownToHtml(content), [content]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                // Disable default link to avoid duplicate warning
                link: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-cyan-400 underline hover:text-cyan-300',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full rounded-lg my-4',
                },
            }),
        ],
        content: htmlContent,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-[500px] px-4 py-3 prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-cyan-400 prose-a:text-cyan-400 prose-code:text-pink-400 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-blockquote:border-l-cyan-500 prose-blockquote:text-slate-400',
            },
        },
    });

    // Update editor content when prop changes
    useEffect(() => {
        if (editor && htmlContent !== editor.getHTML()) {
            editor.commands.setContent(htmlContent);
        }
    }, [htmlContent, editor]);

    // Update editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editable, editor]);

    if (!editor) {
        return null;
    }

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    const addImage = () => {
        const url = window.prompt('Enter image URL:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
            {/* Toolbar */}
            {editable && (
                <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-slate-700 bg-slate-800/50">
                    <MenuButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo"
                    >
                        <Undo size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo"
                    >
                        <Redo size={16} />
                    </MenuButton>

                    <MenuDivider />

                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        isActive={editor.isActive('heading', { level: 1 })}
                        title="Heading 1"
                    >
                        <Heading1 size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading', { level: 2 })}
                        title="Heading 2"
                    >
                        <Heading2 size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        isActive={editor.isActive('heading', { level: 3 })}
                        title="Heading 3"
                    >
                        <Heading3 size={16} />
                    </MenuButton>

                    <MenuDivider />

                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        title="Bold"
                    >
                        <Bold size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        title="Italic"
                    >
                        <Italic size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        isActive={editor.isActive('code')}
                        title="Inline Code"
                    >
                        <Code size={16} />
                    </MenuButton>

                    <MenuDivider />

                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        title="Bullet List"
                    >
                        <List size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        title="Numbered List"
                    >
                        <ListOrdered size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive('blockquote')}
                        title="Quote"
                    >
                        <Quote size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Horizontal Rule"
                    >
                        <Minus size={16} />
                    </MenuButton>

                    <MenuDivider />

                    <MenuButton
                        onClick={addLink}
                        isActive={editor.isActive('link')}
                        title="Add Link"
                    >
                        <LinkIcon size={16} />
                    </MenuButton>
                    <MenuButton
                        onClick={addImage}
                        title="Add Image"
                    >
                        <ImageIcon size={16} />
                    </MenuButton>
                </div>
            )}

            {/* Editor Content */}
            <EditorContent editor={editor} className="min-h-[500px]" />
        </div>
    );
};

// Read-only markdown viewer component
export const TiptapViewer: React.FC<{ content: string }> = ({ content }) => {
    // Convert markdown to HTML
    const htmlContent = useMemo(() => markdownToHtml(content), [content]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: false,
            }),
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    class: 'text-cyan-400 underline hover:text-cyan-300',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full rounded-lg my-4',
                },
            }),
        ],
        content: htmlContent,
        editable: false,
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-indigo-400 prose-a:text-cyan-400',
            },
        },
    });

    useEffect(() => {
        if (editor) {
            const newHtml = markdownToHtml(content);
            if (newHtml !== editor.getHTML()) {
                editor.commands.setContent(newHtml);
            }
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="prose prose-invert prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-indigo-400 prose-a:text-cyan-400">
            <EditorContent editor={editor} />
        </div>
    );
};

export default TiptapEditor;
