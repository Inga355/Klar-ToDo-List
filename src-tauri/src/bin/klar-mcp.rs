fn main() {
    let result = klar_lib::store::app_root()
        .and_then(klar_lib::store::Store::new)
        .and_then(|store| klar_lib::mcp::serve(&store));
    if let Err(error) = result {
        eprintln!("Klar MCP: {error}");
        std::process::exit(1);
    }
}
