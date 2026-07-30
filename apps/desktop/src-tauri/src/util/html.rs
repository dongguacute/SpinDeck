use once_cell::sync::Lazy;
use regex::Regex;

static HEX_ENTITY: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)&#x([0-9a-f]+);").unwrap());
static DEC_ENTITY: Lazy<Regex> = Lazy::new(|| Regex::new(r"&#(\d+);").unwrap());

pub fn decode_html_entities(text: &str) -> String {
  if text.is_empty() {
    return String::new();
  }

  let mut out = HEX_ENTITY
    .replace_all(text, |caps: &regex::Captures| {
      let code = u32::from_str_radix(&caps[1], 16).ok();
      code_point_to_char(code, &caps[0])
    })
    .into_owned();

  out = DEC_ENTITY
    .replace_all(&out, |caps: &regex::Captures| {
      let code = caps[1].parse::<u32>().ok();
      code_point_to_char(code, &caps[0])
    })
    .into_owned();

  out
    .replace("&amp;", "&")
    .replace("&lt;", "<")
    .replace("&gt;", ">")
    .replace("&quot;", "\"")
    .replace("&apos;", "'")
}

fn code_point_to_char(code: Option<u32>, fallback: &str) -> String {
  match code {
    Some(cp) if !(0xD800..=0xDFFF).contains(&cp) && cp <= 0x10FFFF => char::from_u32(cp)
      .map(|c| c.to_string())
      .unwrap_or_else(|| fallback.to_string()),
    _ => fallback.to_string(),
  }
}
