fn main() {
  println!("cargo:rerun-if-changed=icons/icon.icns");
  println!("cargo:rerun-if-changed=icons/icon.png");
  println!("cargo:rerun-if-changed=Info.plist");
  tauri_build::build();
}
