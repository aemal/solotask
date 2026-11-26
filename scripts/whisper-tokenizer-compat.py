"""Keep older Whisper tokenizer initialization local.

Older releases load bundled BPE ranks but call tiktoken's gpt2() solely for its
fixed regex, causing unrelated GPT-2 vocabulary downloads. Supply that exact
regex only for the recognized old call site; leave newer versions untouched.
"""
import inspect

GPT2_PATTERN = r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""


def configure(tokenizer):
    encoding = getattr(tokenizer, "get_encoding", None)
    if encoding is None:
        return False
    try:
        source = inspect.getsource(encoding)
    except (OSError, TypeError):
        return False
    if 'gpt2()["pat_str"]' not in source and "gpt2()['pat_str']" not in source:
        return False
    tokenizer.gpt2 = lambda: {"pat_str": GPT2_PATTERN}
    return True
